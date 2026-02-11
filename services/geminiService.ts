
import { GoogleGenAI, Type, Schema, GenerateContentResponse } from "@google/genai";
import { UserProfile, WeeklyPlanData, FoodItem, ShoppingListResult, ShoppingDuration, ShoppingBudget, ShoppingItem } from "../types";

// Initialize Gemini Client
const apiKey = process.env.API_KEY || 'dummy_key';
const ai = new GoogleGenAI({ apiKey });

const modelName = "gemini-3-flash-preview";

// Helper to generate a unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper for retry logic with exponential backoff
async function callWithRetry<T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorString = JSON.stringify(error);
    const errorMessage = error?.message || errorString;

    // Check for 429 or RESOURCE_EXHAUSTED
    const isQuotaError =
      errorMessage.includes("429") ||
      errorMessage.includes("RESOURCE_EXHAUSTED") ||
      errorMessage.includes("quota") ||
      error?.status === 429 ||
      error?.code === 429;

    if (retries <= 0) {
      console.error("Max retries reached. Last error:", error);
      if (isQuotaError) {
        throw new Error("O servidor de IA está sobrecarregado (Limite de Cota). Por favor, aguarde 1 minuto e tente novamente.");
      }
      throw error;
    }

    console.warn(`API call failed (Quota: ${isQuotaError}). Retrying in ${delay}ms... (${retries} retries left). Error: ${errorMessage.substring(0, 100)}...`);

    // If it's a quota error, ensure we wait at least a few seconds to let the rate limit bucket refill
    // Exponential backoff: 2s -> 4s -> 8s -> 16s -> 32s
    await new Promise(resolve => setTimeout(resolve, delay));

    return callWithRetry(fn, retries - 1, delay * 2);
  }
}

// NOVA FUNÇÃO: Gera lista baseada apenas no perfil, antes do plano existir
export const generateShoppingListFromProfile = async (
  profile: UserProfile,
  budget: ShoppingBudget = ShoppingBudget.ECONOMICAL
): Promise<ShoppingListResult> => {
  const prompt = `
    Atue como nutricionista. Crie uma LISTA DE COMPRAS SUGERIDA para um paciente com o seguinte perfil, para durar 1 semana:
    
    PERFIL:
    - Objetivo: ${profile.goal}
    - Preferências: ${profile.selectedMeals.join(', ')}
    - Custo: ${budget}
    
    A lista deve conter os ingredientes essenciais e básicos para atingir esse objetivo no Brasil.
    Exemplo: Se for hipertrofia, foque em fontes de proteína (frango, ovos) e carboidratos limpos (arroz, batata). Se for emagrecimento, foque em vegetais e proteínas magras.
    
    Retorne JSON com categorias e quantidades estimadas para 1 semana.
  `;

  const shoppingItemSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Nome do item (ex: Peito de Frango)" },
      quantity: { type: Type.STRING, description: "Quantidade estimada para 7 dias" },
      category: { type: Type.STRING, description: "Categoria (Hortifruti, Açougue, Mercearia, etc)" }
    },
    required: ["name", "quantity", "category"]
  };

  const listSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      items: { type: Type.ARRAY, items: shoppingItemSchema },
      estimatedCost: { type: Type.STRING, description: "Estimativa de custo descritiva" }
    },
    required: ["items", "estimatedCost"]
  };

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: listSchema,
      },
    }));

    const data = JSON.parse(response.text || "{}");
    return data as ShoppingListResult;
  } catch (error) {
    console.error("Error generating initial list:", error);
    throw error; // Let the UI handle the specific error message from retry logic
  }
};

// ATUALIZADO: Aceita availableIngredients para basear o plano e cheatDay
export const generateWeeklyPlan = async (
  profile: UserProfile,
  availableIngredients: string[] = []
): Promise<WeeklyPlanData> => {
  const isFasting = profile.intermittentFasting.enabled;
  const fastingDetails = isFasting
    ? `Protocolo de Jejum: ${profile.intermittentFasting.hours} horas de jejum. Início do jejum às ${profile.intermittentFasting.startTime} horas. Dias de jejum: ${profile.intermittentFasting.days.join(', ')}.`
    : "Sem jejum intermitente.";

  // Calculate Water Target explicitly (35ml per kg is standard)
  const calculatedWaterTarget = profile.weight * 35;

  // Monta a string de ingredientes obrigatórios
  const ingredientsPrompt = availableIngredients.length > 0
    ? `\n\n*** REGRA CRÍTICA DE ESTOQUE ***:
       O cardápio deve ser montado EXCLUSIVAMENTE (ou majoritariamente) utilizando os seguintes ingredientes que o usuário já selecionou/comprou:
       LISTA DE INGREDIENTES: ${availableIngredients.join(', ')}.
       
       Seja criativo com esses ingredientes. Evite adicionar novos itens que não estejam nesta lista, a menos que sejam temperos básicos (sal, óleo, etc).`
    : "";

  const cheatDayPrompt = profile.cheatDay
    ? `\n\n*** DIA LIVRE (CHEAT DAY) ***:
       O usuário selecionou "${profile.cheatDay}" como dia livre de dieta.
       Para este dia específico no array de 'days':
       1. NÃO gere calorias restritas. Defina 'totalCalories' e 'dailyCalories' como um valor simbólico ou zero.
       2. Nas refeições deste dia, o nome do alimento deve ser "Refeição Livre" ou sugestões genéricas prazerosas (ex: Pizza, Hambúrguer, Churrasco).
       3. Coloque uma nota de encorajamento para aproveitar o dia.`
    : "";

  const prompt = `
    Atue como um nutricionista esportivo brasileiro de elite.
    Crie um plano alimentar semanal (7 dias) ALTAMENTE personalizado.

    DADOS DO PACIENTE:
    - Idade: ${profile.age} | Peso: ${profile.weight}kg | Altura: ${profile.height}cm | Gênero: ${profile.gender}
    - Nível de Atividade: ${profile.activityLevel}
    - OBJETIVO ESPECÍFICO: ${profile.goal}
    - CONFIGURAÇÃO DE JEJUM INTERMITENTE: ${fastingDetails}
    - Refeições desejadas: ${profile.selectedMeals.join(', ')}.
    ${ingredientsPrompt}
    ${cheatDayPrompt}

    DIRETRIZES ESTRATÉGICAS:
    1. **Cálculos**: Use Mifflin-St Jeor para TMB. Calcule o GET (TDEE).
    2. **Ajuste de Calorias e Macros pelo Objetivo**:
       - **Perda de Gordura (Moderada/Média/Agressiva)**: 
         - Déficit calórico (15-30% conforme intensidade).
         - Priorize Proteínas (2g/kg) para saciedade.
       - **Hipertrofia (Média/Alta)**: 
         - Superávit calórico (200-500kcal).
         - Proteína alta (1.6g-2.2g/kg).
       - **Manter/Recomposição**: Ajuste conforme necessário.
    
    3. **Jejum Intermitente (Se ativo)**:
       - Ajuste o horário sugerido das refeições para caber na janela.
       - Nos dias de jejum (${profile.intermittentFasting.days.join(', ')}), garanta a densidade calórica necessária na janela alimentar.

    4. **Seleção de Alimentos**:
       - Use APENAS a lista de ingredientes fornecida acima como base principal.
       - Combine carboidratos e proteínas adequadamente para o objetivo.
    
    5. **Açúcares/Adoçantes**: Indique explicitamente opções de substituição (Stevia, Xilitol, Eritritol) se o usuário busca perda de peso.

    FORMATO:
    - Retorne APENAS JSON.
  `;

  const foodSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Nome do alimento (ex: Pão Francês, Tapioca)" },
      weight: { type: Type.STRING, description: "Quantidade (ex: 1 unidade, 100g)" },
      calories: { type: Type.NUMBER, description: "Calorias aproximadas" },
      glycemicIndex: { type: Type.STRING, description: "Indice Glicemico: Baixo, Médio ou Alto" },
      isSugarOrSweetener: { type: Type.BOOLEAN, description: "True se for açúcar ou adoçante" }
    },
    required: ["name", "weight", "calories", "glycemicIndex"]
  };

  const mealSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, description: "Tipo da refeição (ex: Café da Manhã)" },
      foods: { type: Type.ARRAY, items: foodSchema },
      totalCalories: { type: Type.NUMBER }
    },
    required: ["type", "foods", "totalCalories"]
  };

  const daySchema: Schema = {
    type: Type.OBJECT,
    properties: {
      day: { type: Type.STRING, description: "Dia da semana (ex: Segunda-feira)" },
      meals: { type: Type.ARRAY, items: mealSchema },
      dailyCalories: { type: Type.NUMBER }
    },
    required: ["day", "meals", "dailyCalories"]
  };

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      bmr: { type: Type.NUMBER, description: "Taxa Metabólica Basal calculada" },
      tdee: { type: Type.NUMBER, description: "Gasto Energético Total calculado" },
      targetCalories: { type: Type.NUMBER, description: "Meta de calorias diárias calculada com base no objetivo" },
      days: { type: Type.ARRAY, items: daySchema }
    },
    required: ["bmr", "tdee", "targetCalories", "days"]
  };

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    }));

    const data = JSON.parse(response.text || "{}");

    data.waterTarget = calculatedWaterTarget;

    if (data.days) {
      data.days.forEach((day: any) => {
        day.meals.forEach((meal: any) => {
          meal.foods.forEach((food: any) => {
            food.id = generateId();
          });
        });
      });
    }

    return data as WeeklyPlanData;
  } catch (error) {
    console.error("Error generating plan:", error);
    throw error;
  }
};

export const getFoodSubstitute = async (
  originalFood: FoodItem,
  mealType: string,
  userGoal: string,
  availableIngredients: string[] = []
): Promise<FoodItem> => {

  const inventoryPrompt = availableIngredients.length > 0
    ? `\n\nIMPORTANTE: O usuário TEM ESTES INGREDIENTES EM CASA: ${availableIngredients.join(', ')}. 
       PRIORIZE usar um desses ingredientes se nutricionalmente adequado para o objetivo.`
    : "";

  const prompt = `
    Sugira UMA substituição direta para o seguinte alimento em um plano alimentar brasileiro:
    Alimento Original: ${originalFood.name} (${originalFood.weight}) - ${originalFood.calories}kcal.
    Refeição: ${mealType}.
    Objetivo do Usuário: ${userGoal}.${inventoryPrompt}

    Se o alimento original for açúcar ou carboidrato simples, priorize sugestões de adoçantes naturais (Stevia, Xilitol, Eritritol) ou opções integrais/baixo índice glicêmico.
    Mantenha a equivalência calórica adequada ao objetivo.
  `;

  const foodSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      weight: { type: Type.STRING },
      calories: { type: Type.NUMBER },
      glycemicIndex: { type: Type.STRING },
      isSugarOrSweetener: { type: Type.BOOLEAN }
    },
    required: ["name", "weight", "calories", "glycemicIndex"]
  };

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: foodSchema,
      },
    }));

    const newFood = JSON.parse(response.text || "{}");
    newFood.id = generateId();
    return newFood as FoodItem;

  } catch (error) {
    console.error("Error substituting food:", error);
    throw new Error("Não foi possível encontrar uma substituição no momento.");
  }
};

export const getShoppingItemSubstitute = async (
  originalItem: ShoppingItem,
  budget: ShoppingBudget
): Promise<ShoppingItem> => {
  const prompt = `
    O usuário quer substituir este item da lista de compras: "${originalItem.name}" (${originalItem.quantity}).
    Categoria: ${originalItem.category}.
    Perfil de Custo: ${budget}.

    Sugira um item equivalente ou alternativo comum no mercado brasileiro (ex: se for uma fruta cara, sugira uma da estação mais barata; se for um corte de carne, sugira outro similar).
    Mantenha a quantidade proporcionalmente adequada.
  `;

  const shoppingItemSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      quantity: { type: Type.STRING },
      category: { type: Type.STRING }
    },
    required: ["name", "quantity", "category"]
  };

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: shoppingItemSchema,
      },
    }));

    const data = JSON.parse(response.text || "{}");
    return data as ShoppingItem;
  } catch (error) {
    console.error("Error substituting shopping item:", error);
    throw new Error("Erro ao substituir item.");
  }
};

export const generateShoppingList = async (
  plan: WeeklyPlanData,
  duration: ShoppingDuration,
  budget: ShoppingBudget
): Promise<ShoppingListResult> => {
  // We serialize a simplified version of the plan to save context, focus on food names
  const simplifiedPlan = plan.days.map(d => ({
    day: d.day,
    foods: d.meals.flatMap(m => m.foods.map(f => `${f.name} (${f.weight})`))
  }));

  const prompt = `
    Com base neste plano alimentar semanal (JSON abaixo), gere uma lista de compras consolidada.
    
    CONFIGURAÇÃO:
    - Duração da Lista: ${duration} (Calcule as quantidades necessárias multiplicando o consumo semanal).
    - Perfil de Custo: ${budget}.
    
    REGRAS DE PERFIL:
    - Se "Econômico": Sugira cortes de carne com melhor custo-benefício, frutas da estação, marcas genéricas, evite itens supérfluos caros. Substitua itens caros por equivalentes nutricionais mais baratos se necessário (ex: Salmão -> Sardinha ou Tilápia).
    - Se "Premium": Sugira itens orgânicos, cortes nobres, marcas de referência, produtos importados se aplicável.
    
    SAÍDA:
    - Retorne um JSON com uma lista de itens agrupados por categoria (Hortifruti, Açougue, Mercearia, Laticínios, Outros).
    - Estime o custo total descritivo (ex: "Baixo - Aprox R$ 200,00" ou "Alto").
    
    PLANO ALIMENTAR (RESUMO):
    ${JSON.stringify(simplifiedPlan)}
  `;

  const shoppingItemSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Nome do item ajustado ao perfil (ex: Arroz Integral Tipo 1)" },
      quantity: { type: Type.STRING, description: "Quantidade total estimada (ex: 2kg, 3 dúzias)" },
      category: { type: Type.STRING, description: "Categoria (Hortifruti, Açougue, etc)" }
    },
    required: ["name", "quantity", "category"]
  };

  const listSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      items: { type: Type.ARRAY, items: shoppingItemSchema },
      estimatedCost: { type: Type.STRING, description: "Estimativa de custo descritiva" }
    },
    required: ["items", "estimatedCost"]
  };

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: listSchema,
      },
    }));

    const data = JSON.parse(response.text || "{}");
    return data as ShoppingListResult;

  } catch (error) {
    console.error("Error generating shopping list:", error);
    throw error;
  }
};

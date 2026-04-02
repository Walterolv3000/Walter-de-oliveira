import { GoogleGenAI, Type } from "@google/genai";

export type AIProvider = 'gemini' | 'kimi' | 'openai' | 'claude';

async function callOpenAI(prompt: string, apiKey: string, responseSchema?: any) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: responseSchema 
            ? `You are a document analyzer. Return ONLY a valid JSON object matching this schema: ${JSON.stringify(responseSchema)}`
            : "You are a helpful document analyzer."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: responseSchema ? { type: "json_object" } : undefined
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "OpenAI API Error");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
async function callKimi(prompt: string, apiKey: string, responseSchema?: any) {
  const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "moonshot-v1-8k",
      messages: [
        {
          role: "system",
          content: responseSchema 
            ? `You are a document analyzer. Return ONLY a valid JSON object matching this schema: ${JSON.stringify(responseSchema)}`
            : "You are a helpful document analyzer."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: responseSchema ? { type: "json_object" } : undefined
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Kimi API Error");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function safeJsonParse(text: string) {
  try {
    // Attempt to strip markdown code blocks if present
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/```\n?([\s\S]*?)\n?```/);
    const cleanText = jsonMatch ? jsonMatch[1].trim() : text.trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse AI response as JSON:", text);
    throw new Error("A resposta da IA não está em um formato JSON válido.");
  }
}

export async function analyzeDocument(
  text: string, 
  apiKey?: string, 
  prompt?: string, 
  provider: AIProvider = 'gemini',
  pdfData?: string // Base64 encoded PDF
) {
  const systemPrompt = `Analyze the following document and provide a structured JSON response. 
    Focus on extracting specific events, companies, and relevant data points.
    If you have access to the visual document (PDF/Image), use it to understand the layout, tables, and context better.
    
    The response must include:
    - summary: A brief general summary.
    - keywords: A list of important keywords.
    - classification: Type of document.
    - findings: A list of specific items found in the text, each with:
        - date: The date of the event (DD/MM/YYYY).
        - uf: The state/region (e.g., SP, RJ).
        - company: The company name involved.
        - event_type: Type of event (e.g., Portaria, Resolução, Edital, etc.).
        - category: Category (Valores / Credenciamento / Procedimento / Instituição Financeira).
        - description: A brief summary of what happened (max 5 lines).
        - relevance: Importance level (HIGH, MEDIUM, LOW).
        - impact_classification: Impact type (Financeiro, Operacional, Regulatório, Concorrencial, Informativo).
        - recommended_action: Recommended action (Enviar e-mail e salvar, Apenas salvar, Atualizar planilha, Sem ação).
        - excerpt: The exact text snippet from the document that justifies this finding.
        - portaria_ato: The number of the Portaria or Act, if available.
        - page: The page number where this was found, if available.

    ${prompt ? `Additional Instructions: ${prompt}` : ''}`;

  const schema = {
    type: "object",
    properties: {
      summary: { type: "string" },
      keywords: { type: "array", items: { type: "string" } },
      classification: { type: "string" },
      findings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            date: { type: "string" },
            uf: { type: "string" },
            company: { type: "string" },
            event_type: { type: "string" },
            category: { type: "string" },
            description: { type: "string" },
            relevance: { type: "string" },
            impact_classification: { type: "string" },
            recommended_action: { type: "string" },
            excerpt: { type: "string" },
            portaria_ato: { type: "string" },
            page: { type: "string" },
          },
          required: ["date", "company", "event_type", "description", "relevance", "excerpt"],
        },
      },
    },
    required: ["summary", "keywords", "classification", "findings"],
  };

  if (provider === 'kimi') {
    if (!apiKey) throw new Error("Kimi API Key is required");
    const result = await callKimi(`${systemPrompt}\n\nDocument Text:\n${text.substring(0, 100000)}`, apiKey, schema);
    return safeJsonParse(result);
  }

  if (provider === 'openai') {
    if (!apiKey) throw new Error("OpenAI API Key is required");
    const result = await callOpenAI(`${systemPrompt}\n\nDocument Text:\n${text.substring(0, 100000)}`, apiKey, schema);
    return safeJsonParse(result);
  }

  // Default to Gemini
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY || "" });
  
  const contents: any[] = [
    { text: systemPrompt }
  ];

  if (pdfData) {
    contents.push({
      inlineData: {
        mimeType: "application/pdf",
        data: pdfData
      }
    });
  } else {
    contents.push({ text: `Document Text:\n${text.substring(0, 200000)}` });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: { parts: contents },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          classification: { type: Type.STRING },
          findings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                uf: { type: Type.STRING },
                company: { type: Type.STRING },
                event_type: { type: Type.STRING },
                category: { type: Type.STRING },
                description: { type: Type.STRING },
                relevance: { type: Type.STRING },
                impact_classification: { type: Type.STRING },
                recommended_action: { type: Type.STRING },
                excerpt: { type: Type.STRING },
                portaria_ato: { type: Type.STRING },
                page: { type: Type.STRING },
              },
              required: ["date", "company", "event_type", "description", "relevance", "excerpt"],
            },
          },
        },
        required: ["summary", "keywords", "classification", "findings"],
      },
    },
  });

  return safeJsonParse(response.text || "{}");
}

export async function chatWithDocument(
  text: string, 
  question: string, 
  history: { role: string, content: string }[], 
  apiKey?: string, 
  prompt?: string,
  provider: AIProvider = 'gemini',
  pdfData?: string // Base64 encoded PDF
) {
  const systemInstruction = `${prompt || "You are an expert document analyzer. Use the provided document to answer the user's questions accurately. If the information is not in the document, say so."}`;

  if (provider === 'kimi') {
    if (!apiKey) throw new Error("Kimi API Key is required");
    const fullPrompt = `System: ${systemInstruction}\n\nDocument Content:\n${text.substring(0, 100000)}\n\nUser: ${question}`;
    return await callKimi(fullPrompt, apiKey);
  }

  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY || "" });
  
  const historyParts = (history || []).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  // For Gemini, we can include the PDF in the first message if it's a new chat
  // or just use the text context.
  const chat = ai.chats.create({
    model: "gemini-3.1-flash-lite-preview",
    config: {
      systemInstruction,
    },
    history: historyParts
  });

  const messageParts: any[] = [];
  if (pdfData && historyParts.length === 0) {
    messageParts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: pdfData
      }
    });
  } else if (!pdfData && historyParts.length === 0) {
    messageParts.push({ text: `Document Content:\n${text.substring(0, 200000)}` });
  }
  
  messageParts.push({ text: question });

  const response = await chat.sendMessage({ message: messageParts });
  return response.text;
}

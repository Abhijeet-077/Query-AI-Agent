import { GoogleGenAI, Type } from "@google/genai";
import type { ExtractedEntity } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const entitySchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      pan: {
        type: Type.STRING,
        description: "The 10-character Permanent Account Number (PAN). Should be uppercase alphanumeric.",
      },
      relation: {
        type: Type.STRING,
        description: "The relationship. This should always be the string 'PAN_Of'.",
      },
      entityName: {
        type: Type.STRING,
        description: "The full name of the person or organization associated with the PAN.",
      },
      entityType: {
        type: Type.STRING,
        description: "The type of entity. Should be either 'Organisation' for companies or 'Name' for individuals.",
      },
    },
    required: ["pan", "relation", "entityName", "entityType"],
  },
};


export async function extractEntitiesFromText(text: string): Promise<ExtractedEntity[]> {
  const prompt = `
    Based on the following document text, extract all entities of type 'Organisation', 'Name', and 'PAN'.
    For each PAN found, create a relation 'PAN_Of' linking it to the corresponding Name or Organisation.
    - If an entity name contains 'PVT. LTD.', 'LTD.', 'SERVICES', 'AGENCIES', 'TRADERS', 'COMMERCIALS', 'UDYOG', 'ENTERPRISES', 'CONSULTANTS', 'DEVELOPERS', 'BUILDERS', 'LOGISTICS', 'MARKETING', or 'MERCHANTS', classify it as an 'Organisation'.
    - If an entity name is followed by '(HUF)', classify it as a 'Name' and include '(HUF)' in the entityName.
    - For all other cases, classify the entity as a 'Name'.
    Ensure every PAN in the document is extracted along with its corresponding entity.

    Document Text:
    ---
    ${text}
    ---
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: entitySchema,
      },
    });

    const jsonResponse = response.text.trim();
    if (!jsonResponse) {
        throw new Error("AI returned an empty response.");
    }

    const parsedData = JSON.parse(jsonResponse) as ExtractedEntity[];
    
    // Simple validation
    if (!Array.isArray(parsedData)) {
      throw new Error("AI response is not in the expected array format.");
    }

    return parsedData;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof SyntaxError) {
      throw new Error("Failed to parse the AI's response. The data may be malformed.");
    }
    throw new Error("Failed to extract entities from the document. The AI model returned an error.");
  }
}

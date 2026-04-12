import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
    try {
        const { csvData } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "Missing API Key in .env.local" }, { status: 500 });
        }

        // Initialize Gemini (1.5 Flash is incredibly fast and has a huge context window for CSVs)
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Attached is a CSV log of 30 simulated matches of the card game Durak. The columns are MatchID, Players, Difficulty, Perevodnoy (boolean), TurnNumber, PlayerName, Action, Card, TableState, and Error.
        
        Please act as an expert Durak referee. Analyze this log and answer:
        1. Were there any infinite loops or 'Engine Rejected Action' errors?
        2. Did any 'Hard' bot play a Trump card when TableState was empty?
        3. Did the Perevodnoy matches generate longer turn counts on average than standard throw-in matches?
        If you find any logic anomalies where a bot played a card that violates standard Durak rules based on the TableState, point out the exact MatchID and TurnNumber.
        
        CSV Data:
        ${csvData}`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        return NextResponse.json({ analysis: response });

    } catch (error) {
        console.error("Gemini API Error:", error);
        return NextResponse.json({ error: "Failed to analyze data with Gemini." }, { status: 500 });
    }
}
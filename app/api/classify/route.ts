import { NextResponse } from 'next/server';
import { client } from '@gradio/client';

export async function POST(req: Request) {
    try {
        const { image } = await req.json();

        if (!image) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        const hfToken = process.env.HF_TOKEN;

        // Connect to the Hugging Face Space (token is optional if the space is Public)
        console.log("Connecting to Hugging Face space: souvikvos/fruitvision-classifier");
        const options: any = {};
        if (hfToken) {
            options.token = hfToken as `hf_${string}`;
        }
        
        const app = await client("souvikvos/fruitvision-classifier", options);

        // Convert the base64 image back into a Blob so Gradio can process it
        const base64Data = image.split(',')[1];
        const mimeType = image.split(',')[0].split(':')[1].split(';')[0];
        
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: mimeType });

        console.log("Sending image to /classify_fruit...");
        // Call the classify_fruit endpoint
        const result = await app.predict("/classify_fruit", [blob]);

        console.log("Hugging Face Response:", JSON.stringify(result, null, 2));

        return NextResponse.json({ success: true, data: result.data });

    } catch (error: any) {
        console.error("Hugging Face API Error:", error);
        return NextResponse.json({ error: "Failed to classify image", details: error.message }, { status: 500 });
    }
}

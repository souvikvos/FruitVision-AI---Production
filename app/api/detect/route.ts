import { NextResponse } from 'next/server';
import { client } from '@gradio/client';

export async function POST(req: Request) {
    try {
        const { image } = await req.json();

        if (!image) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        const hfToken = process.env.HF_TOKEN;

        // Connect to the Hugging Face Space
        console.log("Connecting to Hugging Face space: souvikvos/fruitvision-detector");
        const options: any = {};
        if (hfToken) {
            options.token = hfToken as `hf_${string}`;
        }
        
        const app = await client("souvikvos/fruitvision-detector", options);

        // Convert the base64 image back into a Blob so Gradio can process it
        const base64Data = image.split(',')[1];
        const mimeType = image.split(',')[0].split(':')[1].split(';')[0];
        
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: mimeType });

        console.log("Sending image to /detect_fruits...");
        // Call the detect_fruits endpoint
        const result = await app.predict("/detect_fruits", [blob]);

        const responseData = result.data as any[];
        console.log("Hugging Face Response Data Length:", responseData?.length);

        return NextResponse.json({ success: true, data: responseData });

    } catch (error: any) {
        console.error("Hugging Face API Error:", error);
        return NextResponse.json({ error: "Failed to detect objects", details: error.message }, { status: 500 });
    }
}

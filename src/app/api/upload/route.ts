import { NextResponse } from "next/server";
import ImageKit from "imagekit";

let imagekitInstance: ImageKit | null = null;

function getImageKit() {
  if (!imagekitInstance) {
    imagekitInstance = new ImageKit({
      publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "placeholder_public_key",
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "placeholder_private_key",
      urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/placeholder",
    });
  }
  return imagekitInstance;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const imagekit = getImageKit();
    const response = await imagekit.upload({
      file: base64,
      fileName: file.name,
      folder: "/jsk-jewellery",
    });

    return NextResponse.json({ url: response.url });
  } catch (error) {
    console.error("ImageKit upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

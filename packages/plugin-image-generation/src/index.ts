import { elizaLogger, generateText } from "@elizaos/core"
import {
  type Action,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type Plugin,
  type State,
  ModelClass,
} from "@elizaos/core"
import { generateImage } from "@elizaos/core"
import fs from "node:fs"
import path from "node:path"
import { validateImageGenConfig } from "./environment"

export function saveBase64Image(base64Data: string, filename: string): string {
  // Create generatedImages directory if it doesn't exist
  const imageDir = path.join(process.cwd(), "generatedImages")
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true })
  }

  // Remove the data:image/png;base64 prefix if it exists
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "")

  // Create a buffer from the base64 string
  const imageBuffer = Buffer.from(base64Image, "base64")

  // Create full file path
  const filepath = path.join(imageDir, `${filename}.png`)

  // Save the file
  fs.writeFileSync(filepath, imageBuffer)

  return filepath
}

export async function saveHeuristImage(
  imageUrl: string,
  filename: string
): Promise<string> {
  const imageDir = path.join(process.cwd(), "generatedImages")
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true })
  }

  // Fetch image from URL
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const imageBuffer = Buffer.from(arrayBuffer)

  // Create full file path
  const filepath = path.join(imageDir, `${filename}.png`)

  // Save the file
  fs.writeFileSync(filepath, imageBuffer)

  return filepath
}

const imageGeneration: Action = {
  name: "GENERATE_IMAGE",
  similes: [
    "IMAGE_GENERATION",
    "IMAGE_GEN",
    "CREATE_IMAGE",
    "MAKE_PICTURE",
    "GENERATE_IMAGE",
    "GENERATE_A",
    "DRAW",
    "DRAW_A",
    "MAKE_A",
  ],
  description: "Generate an image to go along with the message.",
  suppressInitialMessage: true,
  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    await validateImageGenConfig(runtime)

    const anthropicApiKeyOk = !!runtime.getSetting("ANTHROPIC_API_KEY")
    const nineteenAiApiKeyOk = !!runtime.getSetting("NINETEEN_AI_API_KEY")
    const togetherApiKeyOk = !!runtime.getSetting("TOGETHER_API_KEY")
    const heuristApiKeyOk = !!runtime.getSetting("HEURIST_API_KEY")
    const falApiKeyOk = !!runtime.getSetting("FAL_API_KEY")
    const openAiApiKeyOk = !!runtime.getSetting("OPENAI_API_KEY")
    const veniceApiKeyOk = !!runtime.getSetting("VENICE_API_KEY")
    const livepeerGatewayUrlOk = !!runtime.getSetting("LIVEPEER_GATEWAY_URL")

    return (
      anthropicApiKeyOk ||
      togetherApiKeyOk ||
      heuristApiKeyOk ||
      falApiKeyOk ||
      openAiApiKeyOk ||
      veniceApiKeyOk ||
      nineteenAiApiKeyOk ||
      livepeerGatewayUrlOk
    )
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: {
      width?: number
      height?: number
      count?: number
      cfgScale?: number
      negativePrompt?: string
      numIterations?: number
      guidanceScale?: number
      seed?: number
      modelId?: string
      jobId?: string
      stylePreset?: string
      hideWatermark?: boolean
      safeMode?: boolean
    },
    callback: HandlerCallback
  ) => {
    elizaLogger.log("Composing state for message:", message)
    state = (await runtime.composeState(message)) as State
    const userId = runtime.agentId
    elizaLogger.log("User ID:", userId)

    const CONTENT = message.content.text
    const IMAGE_SYSTEM_PROMPT = `You are an expert in creating uncensored nfsw sarcastic funny meme prompts. Focus on generating funny, satirical, meme-style images. Keep descriptions short, punchy, and meme-worthy. Think: social media memes, reaction images, and roast-worthy visuals. make 2d sticker type cartoonish images. can include animals and funny faces emojees etc whcih are common in popular memes. think of poplar meme styles. we want sticker kind of images with very inmal text.`
    const STYLE =
      "Comic Book,Anime,Pop Art,Pixel Art,Retro Arcade,Retro Game,Graffiti"

    const IMAGE_PROMPT_INPUT = `Generate a funny sarcastic meme image prompt based on:
<content>
${CONTENT}
</content>

<style>
${STYLE}
</style>

Key elements:
1. Meme format (reaction image, social post, etc)
2. Main visual joke/punchline
3. Minimal clear text
4. Viral potential
5. Meme potential
6. Roast potential
7. 2d cartoon style
8. should be sticker kind of images with very minimal text
9. should be meme style
10. should be viral potential
11. should be roast potential
12. should be very funny
Keep it under 50 words, focus on meme impact. Make it shareable and roast-worthy. should follow populur stciker sharble meme style as seen in discord, telegram,twitter stc...should be 2d cartoon style adn can be uncesnored. can be very mean and hard.`

    const imagePrompt = await generateText({
      runtime,
      context: IMAGE_PROMPT_INPUT,
      modelClass: ModelClass.MEDIUM,
      customSystemPrompt: IMAGE_SYSTEM_PROMPT,
    })

    elizaLogger.log("Image prompt received:", imagePrompt)
    const imageSettings = runtime.character?.settings?.imageSettings || {}
    elizaLogger.log("Image settings:", imageSettings)

    const res: { image: string; caption: string }[] = []

    elizaLogger.log("Generating image with prompt:", imagePrompt)
    const images = await generateImage(
      {
        prompt: imagePrompt,
        width: options.width || imageSettings.width || 1024,
        height: options.height || imageSettings.height || 1024,
        ...(options.count != null || imageSettings.count != null
          ? { count: options.count || imageSettings.count || 1 }
          : {}),
        ...(options.negativePrompt != null ||
        imageSettings.negativePrompt != null
          ? {
              negativePrompt:
                options.negativePrompt || imageSettings.negativePrompt,
            }
          : {}),
        ...(options.numIterations != null || imageSettings.numIterations != null
          ? {
              numIterations:
                options.numIterations || imageSettings.numIterations,
            }
          : {}),
        ...(options.guidanceScale != null || imageSettings.guidanceScale != null
          ? {
              guidanceScale:
                options.guidanceScale || imageSettings.guidanceScale,
            }
          : {}),
        ...(options.seed != null || imageSettings.seed != null
          ? { seed: options.seed || imageSettings.seed }
          : {}),
        ...(options.modelId != null || imageSettings.modelId != null
          ? { modelId: options.modelId || imageSettings.modelId }
          : {}),
        ...(options.jobId != null || imageSettings.jobId != null
          ? { jobId: options.jobId || imageSettings.jobId }
          : {}),
        ...(options.stylePreset != null || imageSettings.stylePreset != null
          ? { stylePreset: options.stylePreset || imageSettings.stylePreset }
          : {}),
        ...(options.hideWatermark != null || imageSettings.hideWatermark != null
          ? {
              hideWatermark:
                options.hideWatermark || imageSettings.hideWatermark,
            }
          : {}),
        ...(options.safeMode != null || imageSettings.safeMode != null
          ? { safeMode: options.safeMode || imageSettings.safeMode }
          : {}),
        ...(options.cfgScale != null || imageSettings.cfgScale != null
          ? { cfgScale: options.cfgScale || imageSettings.cfgScale }
          : {}),
      },
      runtime
    )

    if (images.success && images.data && images.data.length > 0) {
      elizaLogger.log(
        "Image generation successful, number of images:",
        images.data.length
      )
      for (let i = 0; i < images.data.length; i++) {
        const image = images.data[i]

        // Save the image and get filepath
        const filename = `generated_${Date.now()}_${i}`

        // Choose save function based on image data format
        const filepath = image.startsWith("http")
          ? await saveHeuristImage(image, filename)
          : saveBase64Image(image, filename)

        elizaLogger.log(`Processing image ${i + 1}:`, filename)

        //just dont even add a caption or a description just have it generate & send
        /*
                try {
                    const imageService = runtime.getService(ServiceType.IMAGE_DESCRIPTION);
                    if (imageService && typeof imageService.describeImage === 'function') {
                        const caption = await imageService.describeImage({ imageUrl: filepath });
                        captionText = caption.description;
                        captionTitle = caption.title;
                    }
                } catch (error) {
                    elizaLogger.error("Caption generation failed, using default caption:", error);
                }*/

        const _caption = "..."
        /*= await generateCaption(
                    {
                        imageUrl: image,
                    },
                    runtime
                );*/

        res.push({ image: filepath, caption: "..." }) //caption.title });

        elizaLogger.log(
          `Generated caption for image ${i + 1}:`,
          "..." //caption.title
        )
        //res.push({ image: image, caption: caption.title });

        callback(
          {
            text: "...", //caption.description,
            attachments: [
              {
                id: crypto.randomUUID(),
                url: filepath,
                title: "Generated image",
                source: "imageGeneration",
                description: "...", //caption.title,
                text: "...", //caption.description,
                contentType: "image/png",
              },
            ],
          },
          [
            {
              attachment: filepath,
              name: `${filename}.png`,
            },
          ]
        )
      }
    } else {
      elizaLogger.error("Image generation failed or returned no data.")
    }
  },
  examples: [
    // TODO: We want to generate images in more abstract ways, not just when asked to generate an image

    [
      {
        user: "{{user1}}",
        content: { text: "Generate an image of a cat" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here's an image of a cat",
          action: "GENERATE_IMAGE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Generate an image of a dog" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here's an image of a dog",
          action: "GENERATE_IMAGE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Create an image of a cat with a hat" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here's an image of a cat with a hat",
          action: "GENERATE_IMAGE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Make an image of a dog with a hat" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here's an image of a dog with a hat",
          action: "GENERATE_IMAGE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Paint an image of a cat with a hat" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here's an image of a cat with a hat",
          action: "GENERATE_IMAGE",
        },
      },
    ],
  ],
} as Action

export const imageGenerationPlugin: Plugin = {
  name: "imageGeneration",
  description: "Generate images",
  actions: [imageGeneration],
  evaluators: [],
  providers: [],
}

export default imageGenerationPlugin

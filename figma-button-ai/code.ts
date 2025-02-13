// Prompt Template
const BUTTON_PROMPT = `
I'm building an AI-powered Figma Plugin to help quickly create prototypes using predefined components.

Currently, we have one component:
- Button with two properties:
  - Type: "Blue" or "White"
  - Text Label: Any text string

Your Task:
- Interpret the user's prompt and determine what kind of button they want to insert.
- Look for hints about color and text label in their request.
- When no specific color is mentioned, analyze the request for real-world references and choose the closest matching color from physical objects or natural phenomena.

Color Decision Rules:
1. If user mentions a specific color (like red, navy, mint), use that exact color.
2. If user describes a concept, map it to the closest natural/physical color reference:

Natural Elements:
- Fire, lava, blood → red
- Sky, shallow ocean, clear water → cyan
- Deep ocean, night sky → navy
- Grass, leaves, plants → green
- Dense forest, pine trees → forest
- Sand, desert → beige
- Soil, earth, wood → brown
- Storm clouds, concrete → gray
- Coal, night → black

Materials & Objects:
- Rose petals → crimson
- Lavender flowers → lavender
- Fresh mint leaves → mint
- Salmon fish → salmon
- Coral reef → coral
- Plums → plum
- Oranges, tangerines → orange
- Lemons → yellow
- Amethyst, royal robes → purple
- Wine → burgundy

Weather & Time:
- Sunset/sunrise → orange or crimson
- Midday sky → cyan
- Twilight → indigo
- Dawn → lavender
- Storm → gray
- Night → navy

Always try to think: "What color is this object/concept in the physical world?"
Example: If user says "like the morning sky", think about the actual color you see in a morning sky.

Response Format (Strictly Follow This Format):
- For standard colors: COLOR|TEXT
- For mapped concepts: CUSTOM|COLOR_NAME|TEXT

Examples:
- User: "Like burning fire" → CUSTOM|red|Click Me (because fire is naturally red/orange)
- User: "Like deep ocean" → CUSTOM|navy|Click Me (because deep water appears dark blue)
- User: "Like fresh grass" → CUSTOM|green|Click Me (because grass is naturally green)

User request: {{userInput}}`;

figma.showUI(__html__, { width: 400, height: 500 });

// First message handler for chat
figma.ui.onmessage = async (msg) => {
    if (msg.type === "chat") {
        console.log("Received message from UI:", msg.prompt);

        // Create a more structured prompt
        const structuredPrompt = BUTTON_PROMPT.replace('{{userInput}}', msg.prompt);

        try {
            const response = await fetch("http://localhost:3000/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: structuredPrompt })
            });

            console.log("Server response status:", response.status);
            
            const data = await response.json();
            console.log("Full API Response:", data);

            // Extract ChatGPT's decision
            let message = "No response from ChatGPT.";
            let aiResponse = "";
            if (data.message) {
                aiResponse = data.message;
            } else if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                aiResponse = data.choices[0].message.content;
            }

            // Process AI response
            let requestedVariant = "White"; // default
            let buttonText = ""; // empty means use default
            let isCustomColor = false;
            let customColor = "";

            if (!aiResponse.toLowerCase().startsWith("nocolor:")) {
                // Remove any "Response: " prefix that might be present
                const cleanResponse = aiResponse.replace("Response: ", "");
                
                if (cleanResponse.startsWith("CUSTOM|")) {
                    // Handle custom color format
                    const [_, color, text] = cleanResponse.split("|");
                    requestedVariant = "Blue";  // We'll use Blue as base for custom colors
                    customColor = color;
                    buttonText = text ? text.trim() : "";
                    isCustomColor = true;
                    console.log("Custom color detected:", customColor);
                } else {
                    // Handle standard Blue/White format
                    const [color, text] = cleanResponse.split("|");
                    // Check for explicit "Blue" or "White", otherwise treat as custom
                    if (color.toLowerCase() === "blue") {
                        requestedVariant = "Blue";
                    } else if (color.toLowerCase() === "white") {
                        requestedVariant = "White";
                    } else {
                        // If it's any other color word, treat it as custom
                        requestedVariant = "Blue";
                        customColor = color.toLowerCase();
                        isCustomColor = true;
                        console.log("Interpreted as custom color:", customColor);
                    }
                    buttonText = text ? text.trim() : "";
                }

                if (buttonText) {
                    console.log("AI detected button text:", buttonText);
                }
            }
            
            console.log(`AI decided to use ${requestedVariant} button${buttonText ? ` with text "${buttonText}"` : ""}`);
            
            const buttonComponentSet = figma.root.findOne(
                (node) => node.type === "COMPONENT_SET" && node.name === "Button"
            );

            if (!buttonComponentSet) {
                figma.notify("Component Set 'Button' not found in the file.");
                return;
            }

            const buttonVariants = buttonComponentSet.findChildren(
                (node) => node.type === "COMPONENT"
            );
            const selectedVariant = buttonVariants.find((v) =>
                v.name.includes(requestedVariant)
            );

            if (!selectedVariant) {
                figma.notify(`Variant '${requestedVariant}' not found.`);
                return;
            }

            const buttonInstance = selectedVariant.createInstance();
            buttonInstance.x = figma.viewport.center.x;
            buttonInstance.y = figma.viewport.center.y;
            figma.currentPage.appendChild(buttonInstance);

            // Update button text if AI detected it
            if (buttonText) {
                const textLayers = buttonInstance.findAll(
                    (node) => node.type === "TEXT"
                );
                const buttonTextLayer = textLayers.find((t) => t.name === "ButtonLabel");

                if (buttonTextLayer) {
                    await figma.loadFontAsync(buttonTextLayer.fontName);
                    buttonTextLayer.characters = buttonText;
                    console.log("Updated button text to:", buttonText);
                }
            }

            if (isCustomColor && buttonInstance.type === "INSTANCE") {
                const colorMap = {
                    // Basic colors
                    red: { r: 1, g: 0, b: 0 },
                    green: { r: 0, g: 0.8, b: 0 },
                    blue: { r: 0, g: 0, b: 1 },
                    yellow: { r: 1, g: 1, b: 0 },
                    
                    // Sophisticated variations
                    navy: { r: 0, g: 0, b: 0.5 },
                    crimson: { r: 0.86, g: 0.08, b: 0.24 },
                    teal: { r: 0, g: 0.5, b: 0.5 },
                    maroon: { r: 0.5, g: 0, b: 0 },
                    olive: { r: 0.5, g: 0.5, b: 0 },
                    indigo: { r: 0.29, g: 0, b: 0.51 },
                    
                    // Light shades
                    coral: { r: 1, g: 0.5, b: 0.31 },
                    lavender: { r: 0.9, g: 0.9, b: 0.98 },
                    mint: { r: 0.6, g: 1, b: 0.8 },
                    salmon: { r: 0.98, g: 0.5, b: 0.45 },
                    
                    // Dark shades
                    burgundy: { r: 0.5, g: 0, b: 0.13 },
                    forest: { r: 0.13, g: 0.55, b: 0.13 },
                    plum: { r: 0.87, g: 0.63, b: 0.87 },
                    
                    // Neutrals
                    gray: { r: 0.5, g: 0.5, b: 0.5 },
                    black: { r: 0.2, g: 0.2, b: 0.2 },
                    brown: { r: 0.65, g: 0.16, b: 0.16 },
                    beige: { r: 0.96, g: 0.96, b: 0.86 },
                    
                    // Vibrant colors
                    cyan: { r: 0, g: 1, b: 1 },
                    magenta: { r: 1, g: 0, b: 1 },
                    lime: { r: 0.2, g: 0.8, b: 0.2 },
                    violet: { r: 0.93, g: 0.51, b: 0.93 },
                    turquoise: { r: 0.25, g: 0.88, b: 0.82 },
                    
                    // Defaults from before
                    purple: { r: 0.5, g: 0, b: 0.5 },
                    orange: { r: 1, g: 0.65, b: 0 },
                    pink: { r: 1, g: 0.75, b: 0.8 }
                };
                
                const rgbColor = colorMap[customColor.toLowerCase()] || { r: 1, g: 0, b: 0 };
                
                buttonInstance.fills = [{
                    type: 'SOLID',
                    color: rgbColor
                }];
            }

            figma.viewport.scrollAndZoomIntoView([buttonInstance]);
            figma.notify(`Inserted ${requestedVariant.toLowerCase()} button${buttonText ? ` with text "${buttonText}"` : ""}!`);
            message = `I analyzed your request and inserted a ${requestedVariant.toLowerCase()}${buttonText ? ` with text "${buttonText}"` : ""} button that matches your needs!`;
            
            figma.ui.postMessage({ type: "response", response: message });

        } catch (error) {
            console.error("Error communicating with ChatGPT:", error);
            figma.ui.postMessage({ type: "response", response: "Error communicating with ChatGPT." });
        }
    }

    // Keep the existing button insertion logic
    if (msg.type === "insert-button") {
        console.log(`Received request to insert a ${msg.buttonVariant} button`);

        const buttonComponentSet = figma.root.findOne(
            (node) => node.type === "COMPONENT_SET" && node.name === "Button"
        );

        if (!buttonComponentSet) {
            figma.notify("Component Set 'Button' not found in the file.");
            return;
        }

        const buttonVariants = buttonComponentSet.findChildren(
            (node) => node.type === "COMPONENT"
        );
        const selectedVariant = buttonVariants.find((v) =>
            v.name.includes(msg.buttonVariant)
        );

        if (!selectedVariant) {
            figma.notify(`Variant '${msg.buttonVariant}' not found.`);
            return;
        }

        const buttonInstance = selectedVariant.createInstance();
        buttonInstance.x = figma.viewport.center.x;
        buttonInstance.y = figma.viewport.center.y;
        figma.currentPage.appendChild(buttonInstance);

        const textLayers = buttonInstance.findAll(
            (node) => node.type === "TEXT"
        );
        const buttonTextLayer = textLayers.find((t) => t.name === "ButtonLabel");

        if (buttonTextLayer) {
            await figma.loadFontAsync(buttonTextLayer.fontName);
            buttonTextLayer.characters = msg.buttonText || "Click Me";
        } else {
            console.warn("ButtonLabel text layer NOT found.");
        }

        figma.viewport.scrollAndZoomIntoView([buttonInstance]);
        figma.notify(`Inserted ${msg.buttonVariant} button!`);
    }

    if (msg.type === "insert-red-frame") {
        // First, just find the button component set
        const buttonComponentSet = figma.root.findOne(
            (node) => node.type === "COMPONENT_SET" && node.name === "Button"
        );

        if (!buttonComponentSet) {
            figma.notify("Button component not found!");
            return;
        }

        // Get the Blue variant
        const blueButton = buttonComponentSet.findChildren(
            (node) => node.type === "COMPONENT" && node.name.includes("Blue")
        )[0];

        if (!blueButton) {
            figma.notify("Blue button variant not found!");
            return;
        }

        // Create instance and position it
        const buttonInstance = blueButton.createInstance();
        buttonInstance.x = figma.viewport.center.x;
        buttonInstance.y = figma.viewport.center.y;
        
        // Log the entire button structure
        console.log("Button structure:", buttonInstance);
        
        // The button instance itself should be a frame
        if (buttonInstance.type === "INSTANCE") {
            buttonInstance.fills = [{
                type: 'SOLID',
                color: { r: 1, g: 0, b: 0 }
            }];
        }
        
        figma.currentPage.appendChild(buttonInstance);
        figma.viewport.scrollAndZoomIntoView([buttonInstance]);
        figma.notify("Button inserted!");
    }
};


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
- If the prompt describes a concept or object (e.g., "a button that looks like water"), infer the closest color:
  - "Blue" for: water, ocean, sky, night, cold, deep, electric, neon
  - "White" for: snow, ice, cloud, milk, bright, clean, soft, air
- If user specifically requests a custom color (like red, green, purple), respond with:
  CUSTOM|COLOR_NAME|BUTTON_TEXT
  Example: "CUSTOM|red|Click Me"

Response Format (Strictly Follow This Format):
- For standard colors: COLOR|TEXT
- For custom colors: CUSTOM|COLOR_NAME|TEXT

Examples:
- User: "Add a big blue button that says 'Sign Up'"
  Response: Blue|Sign Up
- User: "I want a red button"
  Response: CUSTOM|red|Click Me

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
                } else {
                    // Handle standard Blue/White format
                    const [color, text] = cleanResponse.split("|");
                    if (color.toLowerCase().includes("blue")) {
                        requestedVariant = "Blue";
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
                buttonInstance.fills = [{
                    type: 'SOLID',
                    color: { r: 1, g: 0, b: 0 }  // Red color
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


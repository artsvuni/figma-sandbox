// Prompt Template
const BUTTON_PROMPT = `
I'm building an AI-powered Figma Plugin to help quickly create prototypes using predefined components.

Currently, we have one component:
- Button
- This component has the following props:
  - Type: Blue, White (Can be one of these) 
  - Text Label: Any text string

Your Task:
- Interpret the user's prompt and determine what kind of button they want to insert.
- Look for hints about color and text label and number of buttons to insert in their request.
- When no specific color is mentioned, analyze the request for real-world references and choose the closest matching color from physical objects or natural phenomena.
- If there is no indication of number of buttons to insert, assume the user wants 1 button.
- Figure out a text label for the button, if not provided, use the default text "Click Me"
- Check if user specifies a target frame (e.g., "in Frame 1", "inside my frame", "to Frame 2")

Color Decision Rules:
1. If user mentions a specific color (like red, navy, mint), use that exact color.
2. If user describes a concept, map it to the closest natural/physical color reference:
Always try to think: "What color is this object/concept in the physical world?"
Example: If user says "like the morning sky", think about the actual color you see in a morning sky.
- For example:
  - Fire, lava, blood → red
  - Sky, shallow ocean, clear water → cyan
  - Deep ocean, night sky → navy
  - Grass, leaves, plants → green
  - Dense forest, pine trees → forest

Number of Buttons Decision Rules:
- If user mentions a quantity (e.g., "3 buttons", "five buttons"), include that number of buttons and use default color for all buttons in your response
- If there is no indication of number of buttons to insert, assume the user wants 1 button.
- If user lists colors, assume the number of buttons is the same as the number of colors, use colors listed for each button in your response.
- If user could define color for surtain number of buttons for example two red and 4 blue (ie insert 2 red and 4 blue buttons), include the number of buttons in your response.

Frame Decision Rules:
- If user mentions any frame by name (e.g., "in Frame 1", "to Frame 2", "inside Frame 3"), use that exact frame name
- If frame is not found on canvas, place buttons on the main canvas instead
- If no frame is mentioned, place buttons on the main canvas

Your Response format(Important! Strictly Follow This Format!):
1. First see if the colors user wants are matching the supported Button types: COLOR|TEXT|FRAME_NAME
2. If any color is not matching the Button type: CUSTOM|COLOR1,COLOR2,COLOR3|TEXT|FRAME_NAME

Note: 
- If no frame is specified, omit the FRAME_NAME part
- FRAME_NAME should be exactly as mentioned by user (e.g., "Frame 1", "Frame 2", etc.)

Examples:
- User: "I want a blue button" (Your logic should be: "this is one of button types") return: BLUE|Click Me
- User: "Snow style CTA" (Your logic should be: "snow is white, so this is one of button types") return: WHITE|Click Me
- User: "Like burning fire" (Your logic should be: "because fire is naturally red/orange") return: CUSTOM|red|Click Me 
- User: "Like deep ocean" (Your logic should be: "because deep water appears dark blue") return: CUSTOM|navy|Click Me
- User: "Like fresh grass" (Your logic should be: "because grass is naturally green") return: CUSTOM|green|Click Me
- User: "Create 3 buttons: red, blue and green" return: CUSTOM|red,blue,green|Click Me
- User: "Make two buttons - one navy, one white" return: CUSTOM|navy,white|Click Me
- User: "red, blue, green" return: CUSTOM|red,blue,green|Click Me
- User: "3 buttons" return: CUSTOM|blue,blue,blue|Click Me
- User: "3 red and 2 white" return: CUSTOM|red,red,red,white,white|Click Me
- User: "Add a blue button to Frame 1" return: BLUE|Click Me|Frame 1
- User: "Insert red and white buttons in Frame 2" return: CUSTOM|red,white|Click Me|Frame 2
- User: "Place 3 green buttons in Frame 3" return: CUSTOM|green,green,green|Click Me|Frame 3
- User: "Add blue button" return: BLUE|Click Me

User request: {{userInput}}`;

figma.showUI(__html__, { width: 400, height: 500 });

// Add colorMap at the top level
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

// First message handler for chat
figma.ui.onmessage = async (msg) => {
    if (msg.type === "chat") {
        console.log("Received message from UI:", msg.prompt);   

        // Add these constants at the top of the handler
        const buttonHeight = 35; // Height of each button
        const verticalSpacing = 45; // 35px height + 10px gap between buttons

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

            // Clean up the AI response and handle multiple button definitions
            let cleanResponse = aiResponse.replace("Response: ", "")
                .replace("- Supported button types: ", "")
                .replace(/^\s+|\s+$/g, '');

            // Process AI response
            let requestedVariant = "White"; // default
            let buttonText = ""; // empty means use default
            let isCustomColor = false;
            let colors = [];

            if (!cleanResponse.toLowerCase().startsWith("nocolor:")) {
                if (cleanResponse.startsWith("CUSTOM|")) {
                    // Handle custom color format with multiple colors
                    const [_, colorStr, text, frameName] = cleanResponse.split("|");
                    colors = colorStr.split(",").map(c => c.trim().toLowerCase());
                    buttonText = text ? text.trim() : "";
                    isCustomColor = true;
                    console.log("Custom colors detected:", colors);

                    // Try to find specified frame if any
                    let targetFrame = null;
                    if (frameName) {
                        targetFrame = figma.root.findOne(
                            (node) => node.type === "FRAME" && node.name === frameName.trim()
                        );
                        if (!targetFrame) {
                            console.log(`Frame "${frameName}" not found, placing on canvas instead`);
                        }
                    }

                    // Calculate starting position
                    let startY;
                    if (targetFrame) {
                        startY = (targetFrame.height / 2) - ((colors.length - 1) * verticalSpacing) / 2;
                    } else {
                        startY = figma.viewport.center.y - ((colors.length - 1) * verticalSpacing) / 2;
                    }

                    const createdButtons = [];

                    // Create one button for each color
                    for (let i = 0; i < colors.length; i++) {
                        const currentColor = colors[i];
                        let currentVariant = "Blue"; // default base for custom colors

                        // Check if current color is a supported variant
                        if (currentColor === "blue") {
                            currentVariant = "Blue";
                            isCustomColor = false;
                        } else if (currentColor === "white") {
                            currentVariant = "White";
                            isCustomColor = false;
                        } else {
                            isCustomColor = true;
                        }

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
                            v.name.includes(currentVariant)
                        );

                        if (!selectedVariant) {
                            figma.notify(`Variant '${currentVariant}' not found.`);
                            continue;
                        }

                        const buttonInstance = selectedVariant.createInstance();
                        // Position based on target
                        if (targetFrame) {
                            buttonInstance.x = targetFrame.width / 2;
                            buttonInstance.y = startY + (i * verticalSpacing);
                            targetFrame.appendChild(buttonInstance);
                        } else {
                            buttonInstance.x = figma.viewport.center.x;
                            buttonInstance.y = startY + (i * verticalSpacing);
                            figma.currentPage.appendChild(buttonInstance);
                        }
                        createdButtons.push(buttonInstance);

                        // Update button text
                        if (buttonText) {
                            const textLayers = buttonInstance.findAll(
                                (node) => node.type === "TEXT"
                            );
                            const buttonTextLayer = textLayers.find((t) => t.name === "ButtonLabel");

                            if (buttonTextLayer) {
                                await figma.loadFontAsync(buttonTextLayer.fontName);
                                buttonTextLayer.characters = buttonText;
                            }
                        }

                        // Apply custom color if needed
                        if (isCustomColor && buttonInstance.type === "INSTANCE") {
                            const rgbColor = colorMap[currentColor] || { r: 1, g: 0, b: 0 };
                            buttonInstance.fills = [{
                                type: 'SOLID',
                                color: rgbColor
                            }];
                        }
                    }

                    // Update viewport and notification
                    if (createdButtons.length > 0) {
                        if (targetFrame) {
                            figma.viewport.scrollAndZoomIntoView([targetFrame]);
                            figma.notify(`Inserted ${createdButtons.length} buttons into ${frameName}!`);
                            message = `I analyzed your request and inserted ${createdButtons.length} buttons into ${frameName}!`;
                        } else {
                            figma.viewport.scrollAndZoomIntoView(createdButtons);
                            figma.notify(`Inserted ${createdButtons.length} buttons on canvas!`);
                            message = `I analyzed your request and inserted ${createdButtons.length} buttons on canvas!`;
                        }
                        figma.ui.postMessage({ type: "response", response: message });
                    }
                } else {
                    // Handle standard Blue/White format
                    const [color, text, frameName] = cleanResponse.split("|");
                    colors = [color.toLowerCase()];
                    buttonText = text ? text.trim() : "";

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

                    // Try to find specified frame if any
                    let targetFrame = null;
                    if (frameName) {
                        targetFrame = figma.root.findOne(
                            (node) => node.type === "FRAME" && node.name === frameName.trim()
                        );
                        if (!targetFrame) {
                            console.log(`Frame "${frameName}" not found, placing on canvas instead`);
                        }
                    }

                    // Calculate starting Y position based on target
                    const startY = targetFrame 
                        ? (targetFrame.height / 2) - ((colors.length - 1) * verticalSpacing) / 2
                        : figma.viewport.center.y - ((colors.length - 1) * verticalSpacing) / 2;

                    const createdButtons = [];

                    // Create buttons
                    for (let i = 0; i < colors.length; i++) {
                        const currentColor = colors[i];
                        let currentVariant = "Blue"; // default base for custom colors

                        // Check if current color is a supported variant
                        if (currentColor === "blue") {
                            currentVariant = "Blue";
                            isCustomColor = false;
                        } else if (currentColor === "white") {
                            currentVariant = "White";
                            isCustomColor = false;
                        } else {
                            isCustomColor = true;
                        }

                        const selectedVariant = buttonVariants.find((v) =>
                            v.name.includes(currentVariant)
                        );

                        if (!selectedVariant) {
                            figma.notify(`Variant '${currentVariant}' not found.`);
                            continue;
                        }

                        const buttonInstance = selectedVariant.createInstance();
                        
                        // Position based on target
                        if (targetFrame) {
                            buttonInstance.x = targetFrame.width / 2;
                            buttonInstance.y = startY + (i * verticalSpacing);
                            targetFrame.appendChild(buttonInstance);
                        } else {
                            buttonInstance.x = figma.viewport.center.x;
                            buttonInstance.y = startY + (i * verticalSpacing);
                            figma.currentPage.appendChild(buttonInstance);
                        }
                        createdButtons.push(buttonInstance);

                        // Update button text
                        if (buttonText) {
                            const textLayers = buttonInstance.findAll(
                                (node) => node.type === "TEXT"
                            );
                            const buttonTextLayer = textLayers.find((t) => t.name === "ButtonLabel");

                            if (buttonTextLayer) {
                                await figma.loadFontAsync(buttonTextLayer.fontName);
                                buttonTextLayer.characters = buttonText;
                            }
                        }

                        // Apply custom color if needed
                        if (isCustomColor && buttonInstance.type === "INSTANCE") {
                            const rgbColor = colorMap[currentColor] || { r: 1, g: 0, b: 0 };
                            buttonInstance.fills = [{
                                type: 'SOLID',
                                color: rgbColor
                            }];
                        }
                    }

                    // Update viewport and notification
                    if (createdButtons.length > 0) {
                        if (targetFrame) {
                            figma.viewport.scrollAndZoomIntoView([targetFrame]);
                            figma.notify(`Inserted ${createdButtons.length} buttons into ${frameName}!`);
                            message = `I analyzed your request and inserted ${createdButtons.length} buttons into ${frameName}!`;
                        } else {
                            figma.viewport.scrollAndZoomIntoView(createdButtons);
                            figma.notify(`Inserted ${createdButtons.length} buttons on canvas!`);
                            message = `I analyzed your request and inserted ${createdButtons.length} buttons on canvas!`;
                        }
                        figma.ui.postMessage({ type: "response", response: message });
                    }
                }
            }

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


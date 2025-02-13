
figma.showUI(__html__, { width: 400, height: 500 });

// First message handler for chat
figma.ui.onmessage = async (msg) => {
    if (msg.type === "chat") {
        console.log("Received message from UI:", msg.prompt);

        // Create a more structured prompt
        const structuredPrompt = `Please respond ONLY in this format: COLOR|TEXT
Where COLOR is either "Blue" or "White", and TEXT is the button text.
For example: "Blue|Get Started" or "White|Learn More"

User request: ${msg.prompt}`;

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

            if (!aiResponse.toLowerCase().startsWith("nocolor:")) {
                const [color, text] = aiResponse.split("|");
                
                // Handle color
                if (color.toLowerCase().includes("blue")) {
                    requestedVariant = "Blue";
                } else if (color.toLowerCase().includes("random")) {
                    requestedVariant = Math.random() < 0.5 ? "Blue" : "White";
                    console.log("Random color requested, chose:", requestedVariant);
                }

                // Handle text
                buttonText = text ? text.trim() : "";
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
};


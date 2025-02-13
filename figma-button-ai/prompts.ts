 // Basic button prompt
export const buttonPrompt = `Please respond ONLY in this format: COLOR|TEXT
Where COLOR is either "Blue" or "White", and TEXT is the button text.
For example: "Blue|Get Started" or "White|Learn More"

User request: {{userInput}}`;

// You can add more prompt variations as comments for experimentation:
/*
// Detailed prompt with more context
export const detailedButtonPrompt = `As a UI/UX expert, analyze the following request and create a button.
Respond ONLY in this format: COLOR|TEXT
Where:
- COLOR must be either "Blue" (for primary actions) or "White" (for secondary actions)
- TEXT should be clear, concise, and action-oriented

Consider:
- Blue buttons for primary actions like Submit, Sign Up, Get Started
- White buttons for secondary actions like Learn More, Cancel, Back

User request: {{userInput}}`;

// Prompt focusing on user intent
export const intentButtonPrompt = `Analyze the user's intent and create an appropriate button.
Response format: COLOR|TEXT
- Use Blue for conversion-focused actions
- Use White for informational actions

User request: {{userInput}}`;
*/
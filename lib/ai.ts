export async function getAIResponse(messages: {role: string, content: string}[]) {
  let url = "https://api.deepseek.com/chat/completions";

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            "Authorization": "Bearer "+process.env.DEEPSEEK_API_KEY, "Content-Type": "application/json"
        },
        body: JSON.stringify({model: 'deepseek-chat', messages: messages})

    })
    const parsed = await response.json();

    console.log(parsed);

    if (!response.ok) {
        console.error(parsed);
        throw new Error("DeepSeek request failed");
    }

    console.log(parsed);

    return parsed.choices[0].message.content;
}
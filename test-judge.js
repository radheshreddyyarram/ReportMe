const fetch = require('node-fetch');

async function testJudge() {
    const code = `
x = input("Enter x: ")
y = input("Enter y: ")
print(f"Result: {int(x) + int(y)}")
    `;
    
    const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
            'x-rapidapi-key': 'caadefb297msh511c4b09781df53p1c115ejsnf83e42deb728'
        },
        body: JSON.stringify({
            source_code: code,
            language_id: 71, // python
            stdin: "5\n10"
        })
    });
    
    const data = await response.json();
    console.log(data);
}

testJudge();

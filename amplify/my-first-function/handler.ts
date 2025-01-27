export const handler = async (event: any) => {
  console.log('Event received:', event);
  
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({
      message: "Hello from my first function!",
      event
    })
  };
}; 
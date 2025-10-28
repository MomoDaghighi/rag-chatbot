import swaggerJSDoc from 'swagger-jsdoc';

export function createSwaggerDocs() {
  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'RAG Chatbot API',
        version: '1.0.0',
        description: 'A simple RAG-based chatbot with caching and history',
      },
      servers: [{ url: `http://localhost:${process.env.PORT || 3000}` }],
    },
    apis: ['./src/index.ts'],
  };

  return swaggerJSDoc(options);
}
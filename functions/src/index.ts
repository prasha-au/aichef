import { onCall, onCallGenkit } from "firebase-functions/https";
import { fetchRecipeFromUrlFlow, searchForRecipesFlow } from './flows/recipe-discovery';
import { ai, firestore, genaiApiKey, googleCustomSearchCtx, googleCustomSearchKey } from './globals';
import { ChatSessionStore } from './chat-session-store';
import { chefAgent } from './flows/agent';
import { isAuthenticatedAndHasRequests } from './auth';


export const searchForRecipes = onCallGenkit({
  secrets: [genaiApiKey],
  authPolicy: isAuthenticatedAndHasRequests,
}, searchForRecipesFlow);


export const getRecipeFromUrl = onCallGenkit({
  secrets: [genaiApiKey],
  authPolicy: isAuthenticatedAndHasRequests,
  timeoutSeconds: 120,
}, fetchRecipeFromUrlFlow);



function getSession(sessionId: string) {
  return ai.loadSession(sessionId, {
    store: new ChatSessionStore(firestore.collection('chat-sessions')),
    initialState: {}
  });
}


export const getSessionInfo = onCall({
  authPolicy: isAuthenticatedAndHasRequests,
}, async (req) => {
  const { sessionId } = req.data;
  const session = await getSession(sessionId);
  const chat = session.chat(chefAgent);
  return {
    messages: chat.messages
      .filter(msg => ['model', 'user'].includes(msg.role) && !!msg.content[0].text)
      .map(msg => {
        return { role: msg.role === 'user' ? 'user' : 'ai', text: msg.content[0].text, data: msg.content[0].data };
      }),
    state: session.state
  };
});


export const queryReply = onCall({
  secrets: [genaiApiKey, googleCustomSearchKey, googleCustomSearchCtx],
  authPolicy: isAuthenticatedAndHasRequests,
}, async (req) => {
  const { query, chatState, sessionId } = req.data;

  const session = await getSession(sessionId);
  const chat = session.chat(chefAgent);

  console.log('query: ', query);
  session.updateState({
    ...session.state,
    requestedRedirect: '',
    ...(chatState ?? {})
  });
  // console.log('session state', session.state);

  const { text } = await chat.send(query);
  console.log('reply: ', text);
  return { text, chatState: session.state };

});


// async function main() {

//   const session = ai.createSession<ChatState>({
//     initialState: {}
//   });

//   console.log("You're chatting with Gemini. Ctrl-C to quit.\n");
//   const readline = createInterface(process.stdin, process.stdout);
//   const mainchat = session.chat(chefAgent);
//   while (true) {
//     const userInput = await readline.question('> ');
//     console.log('>>');
//     const { text } = await mainchat.send(userInput);
//     console.log(' <<<    ', text);
//     console.log(mainchat.messages)
//   }
// }

// main();


console.log('===================== AI Chef Functions initialized =====================');


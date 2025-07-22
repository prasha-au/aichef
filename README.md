# AI Chef

This is an experimental approach at recreating the [Lets Cook recipe project](https://github.com/prasha-au/letscook) using AI agents. I have purposely tried to (over)use AI where possible to evaluate pros and cons. I have also used AI (GH Copilot) to build the frontend side of things as well. Most of the pages have been created and refactored by AI using the other project's Angular frontend as a reference.


### Setup
For local development, add a secrets file at `functions/.secret.local` with the following content:
```
GOOGLE_GENAI_API_KEY=your_google_genai_api_key
GOOGLE_CUSTOM_SEARCH_CTX=your_custom_search_context
GOOGLE_CUSTOM_SEARCH_KEY=your_custom_search_key
```

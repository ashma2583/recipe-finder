#include <napi.h>
#include <vector>
#include <string>
#include <unordered_set> // Using a Hash Set for O(1) lookups!

// This function takes (UserPantry, RecipeIngredients) and returns a score from 0.0 to 1.0
Napi::Value CalculateMatchScore(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    // 1. Data Validation: Ensure we received two arrays
    if (info.Length() < 2 || !info[0].IsArray() || !info[1].IsArray()) {
        Napi::TypeError::New(env, "Two arrays expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Array userPantry = info[0].As<Napi::Array>();
    Napi::Array recipeIngredients = info[1].As<Napi::Array>();

    // 2. Data Science Optimization:
    // We put the user's pantry into an unordered_set. 
    // This allows us to check "Do I have this ingredient?" in O(1) time instead of O(n).
    std::unordered_set<std::string> pantrySet;
    for (uint32_t i = 0; i < userPantry.Length(); i++) {
        pantrySet.insert(userPantry.Get(i).As<Napi::String>().Utf8Value());
    }

    // 3. The Matching Loop
    float matchCount = 0;
    uint32_t recipeTotal = recipeIngredients.Length();

    for (uint32_t i = 0; i < recipeTotal; i++) {
        std::string ing = recipeIngredients.Get(i).As<Napi::String>().Utf8Value();
        if (pantrySet.find(ing) != pantrySet.end()) {
            matchCount++;
        }
    }

    // 4. Calculate Score: (Matches / Total Needed)
    float score = (recipeTotal > 0) ? (matchCount / (float)recipeTotal) : 0.0f;

    return Napi::Number::New(env, score);
}

// Export the function as "calculateMatch"
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "calculateMatch"), Napi::Function::New(env, CalculateMatchScore));
    return exports;
}

NODE_API_MODULE(matcher, Init)
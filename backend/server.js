import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// OpenAI 사용 못할 경우에 fallback
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Product 수동 입력 
const PRODUCTS = {
  "Sports Research": {
    brand: "Sports Research",
    name: "Alaskan Omega-3 Fish Oil (90 softgels)",
    source: "Manual from product page",
    price: 29.99,
    currency: "USD",
    softgels: 90,
    servingSoftgels: 1,
    omega3PerServingMg: 1250,
    epaPerServingMg: 690,
    dhaPerServingMg: 260,
  },
  "NOW Foods": {
    brand: "NOW Foods",
    name: "Super Omega EPA (Double Strength) (180 softgels)",
    source: "Manual from product page",
    price: 24.99,
    currency: "USD",
    softgels: 180,
    servingSoftgels: 2,
    omega3PerServingMg: 1000,
    epaPerServingMg: 500,
    dhaPerServingMg: 250,
  },
};

// helpers
function safeDiv(a, b) {
  if (!b || b === 0) return null;
  return a / b;
}

function calcServings(product) {
  return safeDiv(product.softgels, product.servingSoftgels);
}

function calcTotalOmega3Mg(product) {
  const servings = calcServings(product);
  if (servings == null) return null;
  return servings * product.omega3PerServingMg;
}

function calcPricePerSoftgel(product) {
  return safeDiv(product.price, product.softgels);
}

function calcPricePerServing(product) {
  const servings = calcServings(product);
  if (servings == null) return null;
  return safeDiv(product.price, servings);
}

function calcPricePer1000mgOmega3(product) {
  const totalOmega3Mg = calcTotalOmega3Mg(product);
  if (totalOmega3Mg == null) return null;
  return safeDiv(product.price, totalOmega3Mg / 1000);
}

function calcDecisionScore(product) {
  const pricePer1000 = calcPricePer1000mgOmega3(product);
  const valueFactor = pricePer1000 ? 1 / pricePer1000 : 0;

  // weighted score 
  return (
    product.omega3PerServingMg * 0.25 +
    product.epaPerServingMg * 0.25 +
    product.dhaPerServingMg * 0.15 +
    valueFactor * 100 * 0.35
  );
}

function buildMetrics(key, product) {
  const servings = calcServings(product);
  const totalOmega3 = calcTotalOmega3Mg(product);

  return {
    key,
    displayName: product.name,
    source: product.source,
    price: product.price,
    currency: product.currency,
    softgels: product.softgels,
    servingSoftgels: product.servingSoftgels,
    omega3PerServingMg: product.omega3PerServingMg,
    epaPerServingMg: product.epaPerServingMg,
    dhaPerServingMg: product.dhaPerServingMg,
    servingsPerBottle: servings,
    totalOmega3MgPerBottle: totalOmega3,
    pricePerSoftgel: calcPricePerSoftgel(product),
    pricePerServing: calcPricePerServing(product),
    pricePer1000mgOmega3: calcPricePer1000mgOmega3(product),
  };
}

function buildFallbackAdvice({ winner, mA, mB, profile, scoreA, scoreB }) {
  const budget = profile?.budget ? `예산(${profile.budget})` : "예산";
  const cheaper =
    (mA.pricePer1000mgOmega3 ?? Infinity) < (mB.pricePer1000mgOmega3 ?? Infinity)
      ? mA.key
      : mB.key;

  const morePotent =
    (mA.omega3PerServingMg ?? 0) > (mB.omega3PerServingMg ?? 0) ? mA.key : mB.key;

  return {
    winner,
    reason:
      `OpenAI 응답 생성에 실패하여 정량 지표 기반 추천을 표시합니다. ${budget} 관점에선 ${cheaper}가 가성비(Price/1000mg)가 유리하고, ` +
      `섭취 강도(omega-3/serving) 관점에선 ${morePotent}가 유리합니다.`,
    valueSummary: [
      `Scores (higher is better): ${mA.key}=${scoreA.toFixed(2)}, ${mB.key}=${scoreB.toFixed(2)}`,
      `Value metric used: price per 1000mg omega-3 (lower is better)`,
    ],
    cautions: [
      "복용 중인 약(특히 항응고제 등)이 있다면 전문가와 상의하세요.",
      "개인차로 속불편/비린 트림 등이 있을 수 있어 식후 섭취를 고려하세요.",
    ],
  };
}

function stripCodeFences(text) {
  if (!text) return "";
  return text.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
}

function safeJsonParse(text) {
  const cleaned = stripCodeFences(text);

  // 1) direct parse
  try {
    return { ok: true, json: JSON.parse(cleaned), cleaned };
  } catch (e1) {
    // 2) attempt to extract first JSON object in the text
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const slice = cleaned.slice(start, end + 1);
      try {
        return { ok: true, json: JSON.parse(slice), cleaned: slice };
      } catch (e2) {
        return { ok: false, json: null, cleaned, error: e2?.message || String(e2) };
      }
    }
    return { ok: false, json: null, cleaned, error: e1?.message || String(e1) };
  }
}

// routes
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

app.get("/products", (req, res) => {
  const out = Object.entries(PRODUCTS).map(([k, p]) => buildMetrics(k, p));
  res.json({ products: out });
});

app.post("/compare", async (req, res) => {
  try {
    const { profile, productA, productB } = req.body;

    if (!profile || !productA || !productB) {
      return res.status(400).json({
        error: "profile, productA, productB are required",
      });
    }

    const pA = PRODUCTS[productA];
    const pB = PRODUCTS[productB];

    if (!pA || !pB) {
      return res.status(400).json({
        error: "Invalid product selection. Only Sports Research & NOW Foods are supported.",
      });
    }

    const mA = buildMetrics(productA, pA);
    const mB = buildMetrics(productB, pB);

    const scoreA = calcDecisionScore(pA);
    const scoreB = calcDecisionScore(pB);

    const winnerFromScoreModel = scoreA >= scoreB ? productA : productB;

    const prompt = `
You are a supplement decision assistant.
Use the provided facts only (do NOT invent new facts). Keep it practical and consumer-focused.

User profile:
- Age: ${profile.age}
- Gender: ${profile.gender}
- Current meds: ${profile.meds || "none"}
- Health concerns: ${profile.concerns || "none"}
- Budget: ${profile.budget || "none"}
- Current supplements: ${profile.currentSupplements || "none"}

Facts (A):
- key: ${mA.key}
- price: ${mA.price} ${mA.currency}
- count: ${mA.softgels} softgels
- serving: ${mA.servingSoftgels} softgels
- omega-3 per serving: ${mA.omega3PerServingMg} mg
- EPA per serving: ${mA.epaPerServingMg} mg
- DHA per serving: ${mA.dhaPerServingMg} mg
- $ per 1000mg omega-3: ${mA.pricePer1000mgOmega3}

Facts (B):
- key: ${mB.key}
- price: ${mB.price} ${mB.currency}
- count: ${mB.softgels} softgels
- serving: ${mB.servingSoftgels} softgels
- omega-3 per serving: ${mB.omega3PerServingMg} mg
- EPA per serving: ${mB.epaPerServingMg} mg
- DHA per serving: ${mB.dhaPerServingMg} mg
- $ per 1000mg omega-3: ${mB.pricePer1000mgOmega3}

Quantitative decision model suggests winner: ${winnerFromScoreModel}
(Score A=${scoreA.toFixed(2)}, Score B=${scoreB.toFixed(2)})

Return JSON ONLY (no markdown, no code fences):
{
  "winner": "Sports Research" | "NOW Foods",
  "reason": "2-4 sentences personalized to the user (mention budget/value if relevant)",
  "valueSummary": [
    "1 bullet about value (price per 1000mg omega-3)",
    "1 bullet about potency (omega-3/EPA/DHA per serving)"
  ],
  "cautions": [
    "1-2 short cautions (no medical claims)"
  ]
}
`;

    // OpenAI call + Fallback
    let gptRaw = "";
    let gptJson = null;
    let usedFallback = false;
    let openaiError = null;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      gptRaw = completion.choices?.[0]?.message?.content ?? "";

      const parsed = safeJsonParse(gptRaw);
      if (!parsed.ok) {
        usedFallback = true;
        openaiError = `OpenAI returned non-JSON: ${parsed.error}`;
        gptJson = buildFallbackAdvice({
          winner: winnerFromScoreModel,
          mA,
          mB,
          profile,
          scoreA,
          scoreB,
        });
        gptRaw = parsed.cleaned || gptRaw;
      } else {
        gptJson = parsed.json;
      }
    } catch (err) {
      usedFallback = true;
      openaiError = err?.message || String(err);
      gptJson = buildFallbackAdvice({
        winner: winnerFromScoreModel,
        mA,
        mB,
        profile,
        scoreA,
        scoreB,
      });
      gptRaw = JSON.stringify(gptJson, null, 2);
    }

    res.json({
      betaNotice:
        "Beta: Only Sports Research & NOW Foods are supported. Product facts are manually entered due to scraping blocks (403).",
      usedFallback,
      openaiError,
      profileEcho: profile,
      products: {
        [productA]: mA,
        [productB]: mB,
      },
      scores: {
        [productA]: scoreA,
        [productB]: scoreB,
      },
      winnerFromScoreModel,
      gptJson,
      gptRaw,
    });
  } catch (e) {
    console.error("compare error:", e?.message || e);
    res.status(500).json({ error: "compare failed", detail: e?.message || String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

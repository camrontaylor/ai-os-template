# Examples: A Fully-Built Demo Brand

This folder is the finished meal on the counter. It shows you what AI-OS produces once a brand has been onboarded, so you can see the output before you build your own.

Everything in here is for one made-up company: **Brightline Bookkeeping**, a fractional bookkeeping service for small-business founders.

## Brightline Bookkeeping is not real

It is a fictional demo brand. There is no real company called Brightline Bookkeeping behind this folder. The name, the people, the prices, the reviews, and the results are all invented to show the system working end to end. Do not treat any of it as fact, advice, or a real offer.

## What you are looking at

AI-OS works in two layers. First it builds a foundation about your brand. Then its skills use that foundation to write things for you. This folder shows both.

### 1. The foundation (brand_context)

These three files are the foundation AI-OS builds during onboarding. Every skill reads them so the output sounds like your brand and speaks to your buyer.

- `brightline-bookkeeping/brand_context/voice-profile.md` - how the brand sounds. Tone, personality, words it uses, words it avoids.
- `brightline-bookkeeping/brand_context/positioning.md` - the angle that makes the brand stand out, and why that angle won.
- `brightline-bookkeeping/brand_context/icp.md` - the exact person the brand sells to, in their own words.

### 2. The output (outputs)

These files are the kind of thing the skills then generate from that foundation. Same voice, same buyer, every time.

- `brightline-bookkeeping/outputs/landing-page.md` - a full landing page: hero, problem, how it works, proof, pricing teaser, FAQ, and a closing call to action.
- `brightline-bookkeeping/outputs/social-posts.md` - three platform-native posts: one LinkedIn post, one X/Twitter thread, one Instagram caption.
- `brightline-bookkeeping/outputs/positioning-angles.md` - five different positioning angles with a recommended pick, the kind of menu the positioning skill hands you before you choose.

## How your own brand gets built

You do not write these files by hand. Run `/start-here` when you are ready, answer a few questions, and AI-OS writes the foundation for you. You can also start with a real task first; AI-OS will use sensible defaults and offer onboarding afterward.

To start your own brand, run:

```
/start-here
```

That walks you through setting up your voice, positioning, and ideal customer. After that, the skills have what they need.

## You can delete this folder any time

This `examples/` folder is only here to show you what good looks like. It is not wired into anything. Once you have seen it, you can delete the whole folder and nothing in AI-OS will break.

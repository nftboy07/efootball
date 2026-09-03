import { NextRequest, NextResponse } from 'next/server';

const DASHSCOPE_KEY = process.env.DASHSCOPE_API_KEY || '';

const DASHSCOPE_WORKSPACE = process.env.DASHSCOPE_WORKSPACE_ID || '';

const STAR_PLAYERS = [
  { name: 'Lionel Messi', action: 'executing a signature curling left-foot free kick into the top corner, crowd erupting in celebration under electric yellow and blue stadium lights' },
  { name: 'Lamine Yamal', action: 'performing lightning-fast elastico skill dribble cutting past defenders, celebrating with dynamic stadium floodlights and energetic motion blur' },
  { name: 'Cristiano Ronaldo', action: 'striking a thunderous knuckleball dip shot hitting the back of the net, running to corner flag in iconic stadium celebration with confetti' },
  { name: 'Erling Haaland', action: 'unleashing a powerful acrobatic bicycle kick volley into the goal, high speed slow-motion camera pan with sparks and neon floodlights' },
  { name: 'Neymar Jr', action: 'pulling off a smooth rainbow flick skill move past opponent, smiling in slow motion under dazzling arena spotlights with tournament graphics' },
  { name: 'Jude Bellingham', action: 'scoring a dramatic 90th-minute header winner, spreading arms in legendary celebration in front of roaring stadium crowd with yellow laser beams' },
  { name: 'Vinicius Jr', action: 'exploding on the wing with pure acceleration and stepovers, curling the ball past the keeper with vivid colors and hyper-detailed motion' },
];

export async function POST(request: NextRequest) {
  const randomPlayer = STAR_PLAYERS[Math.floor(Math.random() * STAR_PLAYERS.length)];

  try {
    const qwenRes = await fetch(
      'https://ws-ol68l9sr3gs9rhj4.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + DASHSCOPE_KEY,
          'X-DashScope-WorkSpace': DASHSCOPE_WORKSPACE,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen-plus',
          messages: [
            {
              role: 'system',
              content:
                'You are an expert AI prompt engineer specialized in text-to-video diffusion models like Wan 2.1. Generate a single, highly detailed, realistic 40-word video prompt featuring a real football superstar in an intense eFootball esports match. Include cinematic camera movements, stadium lighting, and action details. Output ONLY the raw prompt text, no quotes, no markdown, no preamble.',
            },
            {
              role: 'user',
              content: 'Create a cinematic vertical 9:16 Instagram Reel prompt featuring ' + randomPlayer.name + ' ' + randomPlayer.action + '. Make it look like official eFootball 2026 4K broadcast with neon stadium atmosphere and text reading Community Cup.',
            },
          ],
          temperature: 0.85,
          max_tokens: 150,
        }),
      }
    );

    const data = await qwenRes.json();
    const promptText = data?.choices?.[0]?.message?.content?.trim();

    if (promptText && promptText.length > 20) {
      return NextResponse.json({
        player: randomPlayer.name,
        prompt: promptText,
      });
    }

    const fallbackPrompt = 'Cinematic vertical 9:16 eFootball 2026 match highlight of ' + randomPlayer.name + ' ' + randomPlayer.action + '. Dynamic drone camera sweep, volumetric stadium spotlights, electric yellow and royal blue visual effects, hyper-realistic motion physics, 4K broadcast quality.';

    return NextResponse.json({
      player: randomPlayer.name,
      prompt: fallbackPrompt,
    });
  } catch (error: any) {
    const fallbackPrompt = 'Cinematic vertical 9:16 eFootball 2026 match highlight of ' + randomPlayer.name + ' ' + randomPlayer.action + '. Dynamic drone camera sweep, volumetric stadium spotlights, electric yellow and royal blue visual effects, hyper-realistic motion physics, 4K broadcast quality.';

    return NextResponse.json({
      player: randomPlayer.name,
      prompt: fallbackPrompt,
    });
  }
}

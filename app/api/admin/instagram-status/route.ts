import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const token =
    body.accessToken ||
    process.env.INSTAGRAM_ACCESS_TOKEN ||
    'EAAUYKazODOYBSVmLFFSyBm1lY3TeZBBVcYdpzHlqQEigTTubccMwHpxmTLZAF8P2vlwUsDFzrypA4YVmHYujdZCbcpX94d7Vm8whJZBMLjLroV69WNxorgsZC5PNtIAPLItRdQj3FkNi6LPuMGmAeKihePvwNlcYWC9SV6n0BuEXeNZASZASN7KZBd9he49HPnA0hvbnygVpZCDzWeSn2sAkuol18mU02QIcNZBZAe1yKn0A3nZAjfFZB4iQHdgXyZCb8ZBQoads9fU7yuNYpo0Kt2SU0d91yQZD';

  try {
    const debugRes = await fetch(
      `https://graph.facebook.com/v20.0/debug_token?input_token=${token}&access_token=${token}`
    );
    const debugData = await debugRes.json();

    const meRes = await fetch(`https://graph.facebook.com/v20.0/me?access_token=${token}`);
    const meData = await meRes.json();

    if (meData?.error) {
      return NextResponse.json({
        valid: false,
        error: meData.error.message,
        code: meData.error.code,
        subcode: meData.error.error_subcode,
        isExpired: meData.error.error_subcode === 463 || meData.error.code === 190,
      });
    }

    const accRes = await fetch(
      `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,instagram_business_account{id,username}&access_token=${token}`
    );
    const accData = await accRes.json();

    let igAccount = null;
    if (Array.isArray(accData?.data)) {
      for (const p of accData.data) {
        if (p.instagram_business_account) {
          igAccount = p.instagram_business_account;
          break;
        }
      }
    }

    return NextResponse.json({
      valid: true,
      user: meData,
      instagramAccount: igAccount,
      debug: debugData?.data,
    });
  } catch (err: any) {
    return NextResponse.json({
      valid: false,
      error: err.message,
    });
  }
}

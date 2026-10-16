export default {
  async fetch(){
    return new Response(JSON.stringify({ok:false,error:"無料AIは接続設定中です。再度ご確認ください。"}),{
      status:503,
      headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
    });
  }
};

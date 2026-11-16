import {getLanguage,translate} from './language.mjs';

function normalized(text) {
  return text.normalize('NFKC').toLowerCase().replace(/['’]/g,'')
    .replace(/[\p{P}\p{S}]/gu,' ').replace(/\s+/g,' ').trim();
}

const greeting = /^(ha+lo+|ha+l+o+|ha+i+|he+l+o+|he+y+|hi+)(?:\s+|$)/;
const rules = [
  [/^(?:selamat pagi|pagi|good morning|morning)$/, 'Selamat pagi, {username}! {assistant} siap menemanimu mengatur keuangan hari ini. Ada yang bisa dibantu?'],
  [/^(?:selamat siang|siang|good afternoon)$/, 'Selamat siang, {username}! Ada yang ingin kamu catat atau tanyakan kepada {assistant}?'],
  [/^(?:selamat sore|sore|good evening)$/, 'Selamat sore, {username}! {assistant} siap membantu. Mau mencatat transaksi atau melihat ringkasan keuanganmu?'],
  [/^(?:selamat malam|malam|good night|goodnight)$/, 'Selamat malam, {username}! Ada yang bisa {assistant} bantu sebelum kamu beristirahat?'],
  [/^ass?alamualaikum(?: warahmatullahi wabarakatuh| wr wb)?$/, 'Waalaikumsalam, {username}! Ada yang bisa {assistant} bantu hari ini?'],
  [/^(?:apa kabar(?:mu)?|bagaimana kabar(?:mu| kamu)|kamu apa kabar|how are you(?: doing)?|how is it going|hows it going)$/, 'Kabar {assistant} baik, {username}! Siap membantu mencatat keuanganmu. Kamu ingin mulai dari mana?'],
  [/^(?:(?:terima kasih|terimakasih|makasih|makasi)(?: banyak| banget)?(?: ya| yah)?|thanks(?: a lot| so much)?|thank you(?: very much| so much)?)$/, 'Sama-sama, {username}! Senang bisa membantu. Kalau perlu bantuan lagi, panggil {assistant}, ya.'],
  [/^(?:siapa kamu|kamu siapa|siapa nama(?:mu| kamu)|nama(?:mu| kamu) siapa|who are you|what is your name|whats your name)$/, '{assistant} adalah asisten keuanganmu, {username}. Aku bisa membantu mencatat transaksi, membuat atau mengisi tabungan, dan melihat ringkasan keuangan.'],
  [/^(?:bantuan|help(?: me)?|apa yang bisa (?:kamu bantu|kamu lakukan|dibantu)|(?:kamu )?bisa (?:apa(?: saja)?|bantu(?: aku| saya)?(?: apa)?)|fitur apa saja|(?:tolong )?bantu (?:aku|saya)(?: dong)?|what can you do|what can you help(?: me)? with|how can you help(?: me)?)$/, '{username}, kamu bisa meminta {assistant} untuk:\n• Mencatat pengeluaran: “beli kopi 5000”.\n• Mencatat pemasukan: “catat pemasukan gaji 5 juta”.\n• Membuat tabungan: “buat tabungan rumah target 500 juta”.\n• Mengisi tabungan: “tambahkan tabungan ke Jepang 500000”.\n• Melihat keuangan: “berapa saldo saat ini?” atau “total pengeluaran bulan ini”.\nSebutkan satu permintaan dalam setiap pesan, ya.'],
  [/^(?:dadah|dah|bye(?: bye)?|goodbye|sampai jumpa(?: lagi)?|sampai nanti|see you(?: later)?|aku pamit|saya pamit)$/, 'Sampai jumpa, {username}! {assistant} siap membantu saat kamu kembali. Semoga harimu menyenangkan.'],
  [/^(?:oke(?: deh| siap)?|ok(?:ay)?|baik(?:lah)?|siap|sip|alright|got it|mengerti|paham)$/, 'Siap, {username}! Kalau ada yang ingin dicatat atau ditanyakan, {assistant} siap membantu.'],
];

// Match complete basic messages only, so greetings never swallow a financial
// request, a naming command, or a follow-up to an unfinished savings draft.
export function basicChatReply(text,{userName,assistantName,renaming=false,language=getLanguage()}={}) {
  if(typeof text!=='string'||text.length>500)return null;
  let message=normalized(text);
  const address=typeof assistantName==='string'?normalized(assistantName):'';
  const stripAddress=value=>{
    if(!address)return value;
    if(value.startsWith(address+' '))value=value.slice(address.length+1);
    if(value.endsWith(' '+address))value=value.slice(0,-address.length-1);
    return value===address?'':value;
  };
  message=stripAddress(message);
  const hello=message.match(greeting);
  if(hello)message=stripAddress(message.slice(hello[0].length));
  const template=hello&&!message?'Halo, {username}! Apa yang bisa {assistant} bantu untuk kamu?':
    rules.find(([pattern])=>pattern.test(message))?.[1];
  if(!template)return null;
  const t=(value,params={})=>translate(value,params,language);
  const params={username:userName?.trim()||t('teman'),assistant:assistantName?.trim()||t('Asisten keuangan')};
  let reply=t(template,params);
  if(!assistantName?.trim())reply+=' '+t('Kamu ingin menamai saya sebagai apa? Contohnya, “aku akan memanggil kamu Muchi”.');
  else if(renaming)reply+=' '+t('Kamu ingin mengganti nama saya menjadi apa?');
  return reply;
}

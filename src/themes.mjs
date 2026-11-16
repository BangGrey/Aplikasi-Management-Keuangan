const theme=(id,title,description,emoji,accent,light,surface,secondary,character=null)=>({id,title,description,emoji,character,colors:{'--accent':accent,'--light':light,'--surface':surface,'--tint':light,'--line':light,'--theme-secondary':secondary},chart:[accent,secondary,'#b8a6d2','#d9c7aa','#9dc4c7','#d6a2ad','#bec58c','#a9b2d0','#c6b39a']});
export const themes=[
 theme('sage','Sage Garden','Tenang seperti taman di pagi hari.','🌱','#56794f','#eaf0e6','#faf9f6','#e3bd92'),
 theme('pink','Strawberry Milk','Manis, lembut, dan penuh semangat.','🍓','#a95878','#f9e8ef','#fff9fb','#e8b3a2'),
 theme('lavender','Lavender Dream','Sedikit magis di setiap catatan.','🔮','#7c65a5','#eee8f8','#fbf9ff','#dcb4ce'),
 theme('peach','Peachy Days','Hangat seperti sinar matahari.','🍑','#b07148','#fae9da','#fffbf6','#d8bc77'),
 theme('hello-kitty','Hello Kitty','Pita merah, pink lembut, dan hari yang manis.','🎀','#b33762','#fbe5ed','#fff8fb','#de7894','kitty'),
 theme('cinnamoroll','Cinnamoroll','Awan putih dan biru langit yang menenangkan.','☁️','#34769d','#e1f2fb','#f7fcff','#9cbde9','cloud'),
 theme('kuromi','Kuromi','Ungu dreamy dengan sedikit sisi jahil.','💜','#77519c','#eee4f7','#fbf8ff','#cc8eb3','jester'),
 theme('lotso','Lotso','Beruang stroberi, hangat dan menggemaskan.','🧸','#a54270','#f7dfeb','#fff8fc','#d89eaf','bear'),
 theme('my-melody','My Melody','Telinga kelinci dan taman bunga serba pink.','🌷','#a94778','#fbe4f0','#fff8fc','#e8a8c1','bunny'),
 theme('pompompurin','Pompompurin','Puding karamel untuk menemani hari santaimu.','🍮','#896126','#fcf0c8','#fffdf4','#caa16c','pudding'),
 theme('keroppi','Keroppi','Hijau segar, kolam kecil, dan semangat baru.','🐸','#397756','#e3f1d8','#fafff5','#c5c978','frog'),
 theme('pochacco','Pochacco','Si puppy ceria dengan sentuhan mint yang segar.','🐾','#397b79','#e0f3ee','#f7fffc','#9fc6b2','puppy'),
 theme('spongebob','SpongeBob','Kuning ceria dan gelembung laut untuk hari yang penuh semangat.','🧽','#9a741b','#fff2bc','#fffdf3','#7dbdc8','sponge'),
 theme('golden-pup','Golden Pup','Anjing kecil hangat yang setia menemani setiap catatan.','🐶','#9a6c42','#f7e8d3','#fffbf6','#c3b07a','dog'),
 theme('mochi-cat','Mochi Cat','Kucing bundar dengan pipi merah muda dan warna persik lembut.','🐱','#ad6b70','#fae7e7','#fff9f8','#d9b795','cat'),
 theme('ducky-days','Ducky Days','Bebek kuning kecil dan biru kolam yang menenangkan.','🐤','#8a782a','#fff3c9','#fffdf5','#9bcdd6','duck'),
 theme('cozy-capybara','Cozy Capybara','Kapibara santai, warna karamel, dan langkah kecil yang tenang.','🦫','#886b4d','#efe4d7','#fcfaf6','#a8b899','capybara'),
 theme('bamboo-panda','Bamboo Panda','Panda mungil di antara bambu dan hijau yang segar.','🐼','#47765d','#e4f1e6','#f9fdf9','#adc293','panda'),
 theme('peach-axolotl','Peach Axolotl','Senyum axolotl dan insang merah muda yang menggemaskan.','🪸','#ae607f','#f9e5ef','#fff9fc','#aabbe0','axolotl'),
 theme('snow-penguin','Snow Penguin','Penguin kecil dengan syal hangat di dunia biru es.','🐧','#477d9e','#e3f0f7','#f9fcff','#d6aba5','penguin'),
];
export const getTheme=id=>themes.find(t=>t.id===id)||themes[0];
export function accessibleTheme(id,premium,pastel='sage'){
 const chosen=getTheme(id);if(premium||!chosen.character)return chosen;
 const fallback=getTheme(pastel);return fallback.character?themes[0]:fallback;
}

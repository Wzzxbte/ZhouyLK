const fs=require('fs');
// recipe-entry.txt is already single-quote-escaped HTML, use it directly
const recipe_html=fs.readFileSync('recipe-entry.txt','utf8');
// Strip outer {id:'recipes',... wrapper added by make-index
const recipe_inner=recipe_html.replace(/^\{id:'recipes',e:'🏭',t:'工作台全配方',h:'/,'').replace(/'\}$/,'');
const recipe_entry='{id:"recipes",e:"🏭",t:"工作台全配方",adult:true,h:\''+recipe_inner+'\'}';

function add(id,e,t,h,adult){
  h=h.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n');
  return '{id:"'+id+'",e:"'+e+'",t:"'+t+'",h:\''+h+'\''+(adult?',adult:true':'')+'}';
}

const sections=[
add('basic','🎮','基础操作','<h2>🎮 基础操作</h2><h3>键盘</h3><div class="tbl"><table><thead><tr><th>操作</th><th>按键</th></tr></thead><tbody><tr><td class="td-k">移动</td><td>W/A/S/D</td></tr><tr><td class="td-k">奔跑</td><td>Shift(按)/X(切)</td></tr><tr><td class="td-k">攻击</td><td>空格(原)/左键(追)</td></tr><tr><td class="td-k">重攻击</td><td>F</td></tr><tr><td class="td-k">格挡</td><td>右键</td></tr><tr><td class="td-k">抓取(男主)</td><td>R(晕→降→装包)</td></tr><tr><td class="td-k">交互</td><td>E</td></tr><tr><td class="td-k">地图</td><td>M</td></tr><tr><td class="td-k">暂停</td><td>Tab/ESC</td></tr><tr><td class="td-k">表情</td><td>按住Q</td></tr><tr><td class="td-k">宰杀</td><td>T</td></tr><tr><td class="td-k">丢弃</td><td>H</td></tr><tr><td class="td-k">快捷栏</td><td>1~0</td></tr><tr><td class="td-k">控制台</td><td>回车</td></tr></tbody></table></div><h3>鼠标</h3><div class="tbl"><table><thead><tr><th>操作</th><th>方式</th></tr></thead><tbody><tr><td class="td-k">缩放</td><td>滚轮</td></tr><tr><td class="td-k">平移</td><td>中键拖动</td></tr><tr><td class="td-k">物品</td><td>右键用/装·左键拖</td></tr><tr><td class="td-k">批量</td><td>Shift+左=×10·SCtrl+左=×100</td></tr><tr><td class="td-k">连交易</td><td>Shift+商人=10次</td></tr></tbody></table></div><h3>快捷键</h3><div class="tbl"><table><thead><tr><th>组合</th><th>效果</th></tr></thead><tbody><tr><td class="td-k">Shift+.</td><td>加速10倍</td></tr><tr><td class="td-k">Shift+,</td><td>恢复原速</td></tr><tr><td class="td-k">Shift+P</td><td>解锁H场景</td></tr></tbody></table></div>'),

recipe_entry,

add('bench','⚒️','工作台解锁','<h2>⚒️ 工作台解锁</h2><div class="tbl"><table><thead><tr><th>工作台</th><th>解锁方式</th></tr></thead><tbody><tr><td class="td-k">手工制作</td><td>默认</td></tr><tr><td class="td-k">木工台</td><td>手工</td></tr><tr><td class="td-k">铁工台</td><td>木工台</td></tr><tr><td class="td-k">人肉工台</td><td>击败老人</td></tr><tr><td class="td-k">植物工台</td><td>曼德拉草/寻宝</td></tr><tr><td class="td-k">肉工台</td><td>长城北洞穴</td></tr><tr><td class="td-k">蜘蛛工台</td><td>蜘蛛女王</td></tr><tr><td class="td-k">沙工台</td><td>蜈蚣Boss</td></tr><tr><td class="td-k">翼工台</td><td>高地</td></tr><tr><td class="td-k">混沌工台</td><td>混沌废土</td></tr><tr><td class="td-k">男之工台</td><td>怪大叔(女主白天接近)</td></tr><tr><td class="td-k">可爱工台</td><td>击败巨型女Boss</td></tr></tbody></table></div>'),

add('tame','👥','驯服管理','<h2>👥 驯服与管理</h2><h3>男主抓人</h3><ol><li>夜袭村庄→帐篷女野人睡觉</li><li>R扑倒→连点R降眩晕→再R装背包</li><li>木笼/铁笼→喂食好感100</li><li>右键收编</li></ol><h3>女主抓人</h3><ul><li><strong>被动</strong>:战败→被侵犯</li><li><strong>主动</strong>:铁棒敲晕→装笼喂食→收编</li></ul><h3>工作分配</h3><ul><li>伐木→伐木场旁</li><li>采矿→矿点(沙地沙·混沌钻石)</li><li>农业→花盆+收获箱</li><li>畜牧→牛/羊/猪</li><li>挤奶→产后NPC+挤奶器</li></ul>',true),

add('follow','⭐','随从获取','<h2>⭐ 随从获取</h2><div class="tbl"><table><thead><tr><th>随从</th><th>方式</th></tr></thead><tbody><tr><td class="td-k">玲香&Keigo</td><td>船事件→静观→救拓海→辩护→分手。男主追玲香→75好感→恋人→上床</td></tr><tr><td class="td-k">拓海</td><td>击败→绑→塞食物→拿笔记</td></tr><tr><td class="td-k">志乃</td><td>东北带牛排</td></tr><tr><td class="td-k">Cassie</td><td>实验室:救博士→打凯西→大脑→身体→博士</td></tr><tr><td class="td-k">巨型女</td><td>混沌废土→击败→Q说服→夸可爱→H→回村</td></tr><tr><td class="td-k">Sally</td><td>原住民Boss→海岸→3宝石→监狱→击败→不处罚→引诱</td></tr><tr><td class="td-k">美人鱼</td><td>造船→钓泳装→送彩虹贝壳→H→跟随</td></tr><tr><td class="td-k">狼人</td><td>强力同伴</td></tr><tr><td class="td-k">师奶</td><td>三次→晚间牛排→道歉→摸→乳交→忍住→H</td></tr></tbody></table></div>',true),

add('hscene','🔞','H场景','<h2>🔞 H场景解锁</h2><h3>女主</h3><div class="tbl"><table><thead><tr><th>事件</th><th>触发</th></tr></thead><tbody><tr><td class="td-k">怪大叔</td><td>中午C路线→击败→男之台</td></tr><tr><td class="td-k">船上伙伴</td><td>圭吾蕾卡做爱→静观→救拓海→辩护→打断</td></tr><tr><td class="td-k">拓海</td><td>击败→说服→绑→塞食物→笔记</td></tr><tr><td class="td-k">研究所</td><td>救博士→凯西→大脑→身体→博士</td></tr><tr><td class="td-k">战败</td><td>血量为0→被侵犯(种族不同动画)</td></tr></tbody></table></div><h3>男主</h3><div class="tbl"><table><thead><tr><th>事件</th><th>方式</th></tr></thead><tbody><tr><td class="td-k">夜袭</td><td>晚帐篷→R扑→降晕→装包→好感75+H</td></tr><tr><td class="td-k">玲香恋爱</td><td>女主船后→男主追→安慰→75+→恋人→H</td></tr><tr><td class="td-k">圭吾NTR</td><td>恋玲香→两次喜欢→击败→不杀→玲香引诱H</td></tr><tr><td class="td-k">人鱼</td><td>彩虹泳装→送→H→跟随</td></tr><tr><td class="td-k">师奶</td><td>晚牛排→道歉→摸→乳交→忍住→H</td></tr><tr><td class="td-k">女巨人</td><td>击败→Q说服→夸可爱→H→回村</td></tr><tr><td class="td-k">莎莉</td><td>击败→不处罚→引诱(拒则喜/受则玩具)</td></tr><tr><td class="td-k">任意女NPC</td><td>笼→好感75+→右键H(常规/强制)</td></tr></tbody></table></div><h3>机制</h3><ul><li>好感75+可邀H。药水+50(<code>potion_love_01</code>)</li><li>常规vs强制:好感高配合/敌对强制</li><li><code>potion_perfume_01</code>魅惑香水让目标发情</li><li>Shift+P解锁全场景</li></ul>',true),

add('breed','🤰','怀孕生育','<h2>🤰 怀孕/生育</h2><h3>NPC怀孕(刷生命球)</h3><ol><li>女NPC+怀孕提升装备</li><li>放入立式厕所第一格</li><li>男NPC设禁止恋爱+允许做爱</li><li>星欲之壶(老人制)提高性欲</li><li>自动→流产→生命球体(厕所第二格)</li></ol><h3>打胎药速刷</h3><p>受孕后喂<code>potion_abortion_01</code>比厕所更快。</p><h3>约娜怀孕(v0.5)</h3><p>约娜×男性H→概率怀孕→腹部可见→可分娩。</p><h3>子女</h3><ul><li>男孩+成长药→年轻人</li><li>女儿→普通女原住民</li><li>母乳→料理台制成长药</li></ul><h3>挤奶器</h3><p>产后女NPC→挤奶器→饲养照料→产母乳。</p>',true),

add('map','🗺️','地图区域','<h2>🗺️ 地图</h2><p><code>/mapopen</code>开全图。</p><div style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0"><div class="crystal"><span class="dot" style="background:#4f8"></span>🟢绿=男女</div><div class="crystal"><span class="dot" style="background:#48f"></span>🔵蓝=男主</div><div class="crystal"><span class="dot" style="background:#f44"></span>🔴红=女主</div><div class="crystal"><span class="dot" style="background:#fff"></span>⚪白=洞穴</div></div><h3>方位</h3><div class="tbl"><table><thead><tr><th>方位</th><th>区域</th><th>要点</th></tr></thead><tbody><tr><td class="td-k">🏖️南</td><td>起始沙滩</td><td>出生·蓝旗</td></tr><tr><td class="td-k">🌲中</td><td>深绿·中立村</td><td>木材·野人</td></tr><tr><td class="td-k">↖️西北</td><td>蜘蛛洞穴</td><td>铁矿·女王</td></tr><tr><td class="td-k">⬆️北</td><td>长城</td><td>肉工台</td></tr><tr><td class="td-k">↗️东北</td><td>高原·遗迹</td><td>牛羊·10层·金矿</td></tr><tr><td class="td-k">↙️西南</td><td>沼泽·实验室</td><td>玲香·Cassie</td></tr><tr><td class="td-k">⬅️西</td><td>孤岛</td><td>零袭击·木筏</td></tr><tr><td class="td-k">➡️东</td><td>沙漠</td><td>蜈蚣·砂台</td></tr><tr><td class="td-k">⬆️⬆️极北</td><td>混沌废土</td><td>终局·女巨人</td></tr><tr><td class="td-k">🕳️地下</td><td>地穴·矿井</td><td>血晶·血肉<span style="color:var(--green)">v0.5</span></td></tr><tr><td class="td-k">🌊东南</td><td>海洋</td><td>珊瑚·美人鱼</td></tr></tbody></table></div><h3>🏴 传送旗</h3><ul><li>蓝旗·家|蜘蛛洞·铁矿|遗迹·10层|沙漠·蜈蚣|混沌·终局</li></ul>'),

add('boss','👹','BOSS攻略','<h2>👹 Boss</h2><div class="tbl"><table><thead><tr><th>Boss</th><th>位置</th><th>对策</th></tr></thead><tbody><tr><td class="td-k">蜘蛛女王</td><td>蜘蛛洞穴</td><td>铁盾·清小蜘蛛</td></tr><tr><td class="td-k">树精之王</td><td>地下</td><td>清藤蔓桩</td></tr><tr><td class="td-k">蜈蚣</td><td>沙漠</td><td>贴底边躲</td></tr><tr><td class="td-k">双头秃鹫</td><td>高原/遗迹</td><td>边缘躲风暴</td></tr><tr><td class="td-k">巨人</td><td>混沌</td><td>抬腿走身后</td></tr><tr><td class="td-k">女巨人</td><td>混沌</td><td>击败→说服→可收</td></tr></tbody></table></div><p>顺序:蜘蛛女王→流浪者→肉台Boss→沙漠→遗迹10层</p>'),

add('material','📦','材料获取','<h2>📦 材料</h2><div class="tbl"><table><thead><tr><th>材料</th><th>途径</th></tr></thead><tbody><tr><td class="td-k">铁矿石</td><td>蜘蛛洞矿(插旗刷新)</td></tr><tr><td class="td-k">蜘蛛丝/皮</td><td>蜘蛛洞/女王</td></tr><tr><td class="td-k">布料</td><td>地穴/遗迹木乃伊</td></tr><tr><td class="td-k">皮革/肉/粪</td><td>铁匠台夹子</td></tr><tr><td class="td-k">羊毛/牛奶</td><td>高原羊/牛</td></tr><tr><td class="td-k">骨头/硬骨</td><td>遗迹骷髅</td></tr><tr><td class="td-k">羽毛</td><td>火鸟/鸡</td></tr><tr><td class="td-k">硬木材</td><td>黑地块(铁斧+)</td></tr><tr><td class="td-k">沙/粘土</td><td>沙滩铲/沼泽挖</td></tr><tr><td class="td-k">金/钻石</td><td>遗迹狗/混沌副产</td></tr><tr><td class="td-k">血晶/血肉</td><td>地穴矿/收集器</td></tr><tr><td class="td-k">战士魂</td><td>图腾+袭击</td></tr><tr><td class="td-k">生命球/母乳</td><td>流产/挤奶器</td></tr></tbody></table></div>'),

add('craft','🔧','关键合成','<h2>🔧 关键合成</h2><div class="tbl"><table><thead><tr><th>物品</th><th>台</th><th>材料</th></tr></thead><tbody><tr><td class="td-k">石斧/镐</td><td>手工</td><td>石头+树枝</td></tr><tr><td class="td-k">木弓</td><td>手工</td><td>木头+纤维</td></tr><tr><td class="td-k">铁剑</td><td>铁</td><td>铁锭+骨头</td></tr><tr><td class="td-k">铁盾</td><td>铁</td><td>铁锭+皮革</td></tr><tr><td class="td-k">铁笼</td><td>铁</td><td>铁锭+纤维</td></tr><tr><td class="td-k">旗帜</td><td>手工</td><td>皮革+树枝</td></tr><tr><td class="td-k">血剑</td><td>肉</td><td>血晶+铁锭</td></tr><tr><td class="td-k">蜘蛛收纳</td><td>蜘蛛</td><td>蜘蛛丝+木头</td></tr><tr><td class="td-k">地刺</td><td>铁</td><td>铁锭+木头</td></tr><tr><td class="td-k">成长药</td><td>料理</td><td>母乳</td></tr></tbody></table></div><p style="font-size:11px;color:var(--muted)">完整见「🏭 工作台全配方」</p>'),

add('weapon','⚔️','武器图鉴','<h2>⚔️ 武器</h2><div class="tbl"><table><thead><tr><th>类型</th><th>代表(代码)</th></tr></thead><tbody><tr><td class="td-k">剑</td><td>铁剑→血剑→混沌剑·武士刀</td></tr><tr><td class="td-k">重</td><td>战斧·蛮勇斧·电锯</td></tr><tr><td class="td-k">远</td><td>木弓→蜘蛛→翼→混沌弓</td></tr><tr><td class="td-k">魔</td><td>心杖·死杖</td></tr><tr><td class="td-k">特</td><td>诅咒手·鞭·纯爱棒</td></tr><tr><td class="td-k">盾</td><td>铁→骨→蜘蛛→肉→混沌</td></tr></tbody></table></div><p style="font-size:11px">完整见作弊码页</p>'),

add('skill','📈','加点推荐','<h2>📈 加点</h2><div class="tbl"><table><thead><tr><th>序</th><th>技能</th><th>说明</th></tr></thead><tbody><tr><td class="td-k">1</td><td>自回复</td><td>1级</td></tr><tr><td class="td-k">2</td><td>采集</td><td>5级</td></tr><tr><td class="td-k">3</td><td>搬运</td><td>3级</td></tr><tr><td class="td-k">4</td><td>队友</td><td>1级·女巨人需6</td></tr><tr><td class="td-k">5</td><td>强击</td><td>5级</td></tr></tbody></table></div><p>属性:HP+ATK优先!AGI没用。两主角共享技能但属性独立。</p><h3>隐藏</h3><ul><li>药草隐藏恢复HP+10</li><li>作物不收→二次转化→大量种子</li><li>晕倒NPC可存箱/台</li></ul>'),

add('base','🏗️','基地选址','<h2>🏗️ 基地</h2><div class="tbl"><table><thead><tr><th>位置</th><th>优势</th></tr></thead><tbody><tr><td class="td-k">左侧孤岛</td><td>零袭击·木筏</td></tr><tr><td class="td-k">玲花沙滩</td><td>无袭击·需剧情</td></tr><tr><td class="td-k">遗迹高地</td><td>防守·近金矿</td></tr><tr><td class="td-k">初始沙滩</td><td>不耗饱食</td></tr></tbody></table></div><h3>防御</h3><ul><li>空中平台→野人不会爬楼梯</li><li>桌子代墙→穿不过</li><li>地刺+拒马防线</li></ul>'),

add('adv','🏆','进阶流派','<h2>🏆 流派</h2><h3>空中无敌</h3><p>高台免疫地面袭击。</p><h3>弓箭军团</h3><p>女野人木弓(不需箭)齐射。</p><h3>格挡反击</h3><p>铁盾+武士刀取消后摇。</p><h3>生命球厂</h3><p>厕所流产/打胎药批量。</p><h3>资源帝国</h3><p>驯服→采矿/伐木/畜牧。混沌区产钻石。</p>'),

add('npc','🔑','关键NPC','<h2>🔑 关键NPC</h2><div class="tbl"><table><thead><tr><th>NPC</th><th>条件</th><th>奖励</th></tr></thead><tbody><tr><td class="td-k">老人</td><td>白天对话</td><td>人肉台</td></tr><tr><td class="td-k">怪大叔</td><td>女主白天接近</td><td>男之台</td></tr><tr><td class="td-k">遗迹双人</td><td>女主触发</td><td>10层</td></tr><tr><td class="td-k">Cassie</td><td>实验室</td><td>人造人机</td></tr><tr><td class="td-k">女巨人</td><td>混沌废土</td><td>说服→同伴</td></tr><tr><td class="td-k">娜娜奇</td><td>妖精商人</td><td>魂换钻石</td></tr></tbody></table></div>'),

add('tips','💡','实用贴士','<h2>💡 贴士</h2><ul><li>饿死复活比吃饭划算</li><li>背后F重击秒杀·肉烤熟</li><li>地刺+拒马+号角刷袭击</li><li>女野人木弓不需箭</li><li>随身皮革+树枝插旗</li><li>蜘蛛洞驻扎→2铁矿</li><li>Shift+商10次交易</li><li>女主主线·男主抓人</li><li>香水+爱情药=好感最快</li><li>Shift+P解锁H场景</li></ul>'),
];

const out='var G=['+sections.join(',\n')+'];';
fs.writeFileSync('guide-data.js',out,'utf8');
console.log('guide-data.js:',out.length,'bytes');

// Verify syntax
try{
  const G=eval(out.replace('var G=','').replace(/;$/,''));
  console.log('✅ OK,',G.length,'sections');
  // Check recipe section
  const recipe_section=G.find(function(g){return g.id==='recipes'});
  console.log('Recipe section length:',recipe_section?recipe_section.h.length:0,'chars');
}catch(err){
  console.log('❌',err.message);
}

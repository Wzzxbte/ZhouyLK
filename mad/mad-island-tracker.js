#!/usr/bin/env node
/**
 * Mad Island 更新追踪器 v2 — 带自检与容错
 *
 * 用法：
 *   node mad-island-tracker.js              # 检查并追加新更新
 *   node mad-island-tracker.js --full       # 重新生成完整历史
 *   node mad-island-tracker.js --check      # 自我诊断（只读，不改文件）
 *   node mad-island-tracker.js --status     # 输出 JSON 状态供外部监控
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const APP_ID = "2739590";
const API_URL = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=${APP_ID}&count=100&maxlength=2000&format=json`;
const BASE_DIR = __dirname;
const DATA_FILE = path.join(BASE_DIR, "mad-island-updates-raw.json");
const OUTPUT_FILE = path.join(BASE_DIR, "mad-island-updates.md");
const TRACK_FILE = path.join(BASE_DIR, "mad-island-tracked.json");
const LOG_FILE = path.join(BASE_DIR, "mad-island-tracker.log");
const CUTOFF_TIMESTAMP = Math.floor(new Date("2024-12-01T00:00:00Z").getTime() / 1000);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;
const STALE_HOURS = 48; // 超过 48 小时未检查视为数据过期

// ==================== 日志系统 ====================

function log(level, msg) {
    const ts = new Date().toISOString();
    const line = `[${ts}] [${level}] ${msg}`;
    try {
        fs.appendFileSync(LOG_FILE, line + "\n", "utf-8");
    } catch (e) { /* ignore */ }
    if (level === "ERROR") console.error(line);
    else console.log(line);
}

// ==================== 翻译映射表 ====================

const TRANSLATIONS = [
    ["This version requires opting into the beta branch to play. Please note that stability is not guaranteed, and we strongly recommend using a separate save file when playing this version.",
        "此版本需切换到 beta 分支才能游玩。稳定性不保证，强烈建议使用独立的存档文件。"],
    ["Due to many changes that may affect game data, please make sure to use a separate save file.",
        "由于许多改动可能影响游戏数据，请务必使用独立的存档文件。"],
    ["As it may be unstable, we recommend keeping a separate save file when playing.",
        "由于可能不稳定，建议游玩时保留独立的存档文件。"],
    ["To play this version, you need to switch to the beta branch.",
        "要游玩此版本，需切换到 beta 分支。"],
    ["To play this version, you must switch the game to the beta branch.",
        "要游玩此版本，必须将游戏切换到 beta 分支。"],
    ["To play this version, you need to switch to the beta version.",
        "要游玩此版本，需切换到 beta 版本。"],
    ["Beta Version Notice", "⚠️ Beta 版本说明"],
    ["This version requires opting into the beta branch to play.",
        "此版本需要切换到 beta 分支才能游玩。"],
    ["Please note that this version may be unstable, so we recommend using a separate save file when playing.",
        "请注意此版本可能不稳定，建议使用独立的存档文件。"],
    ["We identified a critical bug and have released an urgent hotfix.",
        "发现了一个关键 bug，已发布紧急热修复。"],
    ["We've released an emergency update to address a critical bug.",
        "发布了紧急更新以解决关键 bug。"],
    ["Several gameplay-blocking bugs have been fixed.", "修复了多个阻碍游戏进程的 bug。"],
    ["Several critical bugs have been prioritized and fixed.", "优先修复了多个关键 bug。"],
    ["Several critical bugs have been fixed.", "修复了多个关键 bug。"],
    ["Several bug fixes have been implemented.", "实施了多项 bug 修复。"],
    ["We have fixed several critical bugs.", "修复了多个关键 bug。"],
    ["We have fixed a critical bug.", "修复了一个关键 bug。"],
    ["We fixed a critical bug.", "修复了一个关键 bug。"],
    ["A critical bug has been fixed.", "修复了一个关键 bug。"],
    ["Fixed a critical bug related to the Visiting feature.", "修复了与拜访功能相关的关键 bug。"],
    ["We've urgently fixed a critical bug:", "紧急修复了一个关键 bug："],
    ["Bug Fixes & Adjustments", "🔧 Bug 修复与调整"],
    ["Bug Fixes", "🔧 Bug 修复"],
    ["Fixes & Adjustments", "🔧 修复与调整"],
    ["Fixes and Adjustments", "🔧 修复与调整"],
    ["Fixes", "🔧 修复"],
    ["Additions", "🆕 新增内容"],
    ["New Features", "🆕 新增功能"],
    ["New H Scenes", "🆕 新增 H 场景"],
    ["Added H Content", "🆕 新增 H 内容"],
    ["General", "📌 通用"],
    ["Raid Mode", "📌 突袭模式"],
    ["Bug Fix", "🔧 Bug 修复"],
    ["Hotfix", "🔥 热修复"],
    ["External Content 更新", "📦 外部内容更新"],

    // NPC
    ["Large Female Native", "大型女性原住民"], ["Large Male Native", "大型男性原住民"],
    ["Large Young Man", "高大青年"], ["Fat Young Man", "胖青年"], ["Chubby Guy", "胖墩"],
    ["Female Native", "女性原住民"], ["Male Native", "男性原住民"],
    ["Small Native", "小型原住民"], ["Elder Native Woman", "老年女性原住民"],
    ["Elder Native Man", "老年男性原住民"], ["Elder Sister Native", "原住民姐姐"],
    ["Native Boss Lady", "原住民女首领"], ["Tribal Boss", "部落首领"],
    ["Underground Woman", "地下女性"], ["Underground Young Man", "地下青年男性"],
    ["Young Lady", "年轻女士"], ["Young Man", "青年男性"], ["Young Men", "青年男性们"],
    ["Large Boy", "大型男孩"], ["Large Girl", "大型女孩"],
    ["Male Protagonist", "男主角"], ["Male Player", "男性玩家"],
    ["Female Native Girl", "女性原住民女孩"],
    ["Blue-Haired Girl", "蓝发女孩"], ["Pink-Haired Girl", "粉发女孩"],
    ["Yona", "约娜"], ["Nami", "奈米"], ["Reika", "玲香"],
    ["Kana", "卡娜"], ["Lulu", "露露"], ["Takumi", "拓海"], ["Shino", "志乃"],
    ["Santa", "圣诞老人"], ["Reaper", "死神"],
    ["Ent King", "树精之王"], ["Entking", "树精之王"],
    ["Ent Queen", "树精女王"], ["Giant", "巨人"],
    ["Maiden", "少女"], ["Mummy", "木乃伊"], ["Son", "儿子"], ["Boy", "男孩"],
    ["Cave Ape", "洞穴猿"], ["Wisp", "精灵"],
    ["Android", "安卓机器人"], ["Androids", "安卓机器人"],
    ["Android Type-A", "安卓机器人 A 型"], ["Android Type-C", "安卓机器人 C 型"],
    ["Prototype Type B", "原型 B 型"], ["Prototype Type C", "原型 C 型"],

    // H 场景
    ["Male × Hanged Blue-Haired Girl (Normal)", "男性 × 被吊起的蓝发女孩（普通）"],
    ["Male × Hanged Blue-Haired Girl (Forced)", "男性 × 被吊起的蓝发女孩（强制）"],
    ["Male × Hanged Pink-Haired Girl (Normal ×2)", "男性 × 被吊起的粉发女孩（普通 ×2）"],
    ["Yona × Large Young Man (Normal)", "约娜 × 高大青年（普通）"],
    ["Man × Reaper (Normal)", "男性 × 死神（普通）"],
    ["Yona × Son (Normal)", "约娜 × 儿子（普通）"],
    ["Maiden × Male (Forced)", "少女 × 男性（强制）"],
    ["Male × Prototype Type B (Normal)", "男性 × 原型 B 型（普通）"],
    ["Male × Prototype Type C (Normal)", "男性 × 原型 C 型（普通）"],
    ["Male × Android (Normal)", "男性 × 安卓机器人（普通）"],
    ["Yona × Man (Normal) × 3", "约娜 × 男性（普通）× 3"],
    ["Yona × Man (Normal)", "约娜 × 男性（普通）"],
    ["Yona × Male (Missionary)", "约娜 × 男性（传教士体位）"],
    ["Yona × Male", "约娜 × 男性"],
    ["Male Protagonist × Nami (normal H)", "男主角 × 奈米（普通 H）"],
    ["Male Protagonist × Nami (forced H)", "男主角 × 奈米（强制 H）"],
    ["Male Protagonist x Nami (normal H)", "男主角 × 奈米（普通 H）"],
    ["Male Protagonist x Nami (forced H)", "男主角 × 奈米（强制 H）"],
    ["Male Protagonist × Nami", "男主角 × 奈米"],
    ["Yona × Nami (normal H)", "约娜 × 奈米（普通 H）"],
    ["Yona x Nami (normal H)", "约娜 × 奈米（普通 H）"],
    ["Male Protagonist x Santa (Standard H Scene)", "男主角 × 圣诞老人（标准 H 场景）"],
    ["Merry × Male", "梅莉 × 男性"],
    ["H scenes", "H 场景"], ["H scene", "H 场景"], ["H Scene", "H 场景"],
    ["H-animation", "H 动画"], ["H animation", "H 动画"],
    ["H animations", "H 动画"], ["H-animations", "H 动画"],
    ["normal H", "普通 H"], ["forced H", "强制 H"],
    ["Normal H", "普通 H"], ["Forced H", "强制 H"],
    ["Normal", "普通"], ["Forced", "强制"], ["Missionary", "传教士体位"],

    // 系统/物品
    ["Raider's Leather Outfit", "掠夺者皮革套装"],
    ["Outfit Coordination feature", "服装搭配功能"],
    ["Apparel feature", "服装系统"], ["Apparel system", "服装系统"],
    ["Apparel data", "服装数据"], ["Apparel equipment colors", "服装装备颜色"],
    ["Apparel visuals", "服装外观"],
    ["Original NPC loading feature", "原创 NPC 加载功能"],
    ["Workshop upload and subscription feature for Original NPCs", "原创 NPC 的创意工坊上传与订阅功能"],
    ["Dialogue Editing function", "对话编辑功能"],
    ["Dialogue Editing feature", "对话编辑功能"],
    ["Dialogue Editing", "对话编辑"], ["Dialogue Edit", "对话编辑"],
    ["custom dialogue", "自定义对话"],
    ["Visiting feature", "拜访功能"], ["Visiting", "拜访"],
    ["Workshop NPC creation mode", "创意工坊 NPC 创建模式"],
    ["Workshop NPCs", "创意工坊 NPC"],
    ["Workshop items", "创意工坊物品"], ["Workshop item", "创意工坊物品"],
    ["Workshop", "创意工坊"],
    ["Pregnancy and childbirth system for Yona", "约娜怀孕与分娩系统"],
    ["Pregnancy for the large female native", "大型女性原住民怀孕"],
    ["Pregnancy for the underground woman", "地下女性怀孕"],
    ["pregnancy chance", "怀孕几率"], ["pregnancy state", "怀孕状态"],
    ["Pregnancy Accelerator", "怀孕加速器"],
    ["Contraceptive", "避孕药"], ["contraceptives", "避孕药"],
    ["contraceptive effect", "避孕效果"],
    ["Underground Mine", "地下矿井"],
    ["Logging Site", "伐木场"], ["Mining Site", "采矿场"],
    ["Breeding Facility", "繁殖设施"], ["Meal Distributor", "餐食分配器"],
    ["Simple Houses", "简易房屋"], ["Flesh Collector", "血肉收集器"],
    ["Restraint Chain", "束缚锁链"], ["Restraint", "束缚"],
    ["Raid Horn", "突袭号角"], ["Black Curtain Arch", "黑色幕帘拱门"],
    ["Picture Frame", "相框"], ["Snow Dome", "雪球装饰"],
    ["Cursed Hand", "诅咒之手"], ["Reaper's Scythe", "死神之镰"],
    ["Reaper's aura effect", "死神的灵气效果"],
    ["Cursed Jar", "诅咒罐子"], ["Chaos Vines", "混沌藤蔓"],
    ["Chaos Ring", "混沌戒指"], ["Toy Hammer", "玩具锤"],
    ["Kodachi", "小太刀"], ["Shuriken", "手里剑"],
    ["Pocket", "口袋"], ["Bottle (Flower)", "瓶子（花）"],
    ["Withered Tree", "枯树"],
    ["White Tiger Hood", "白虎兜帽"], ["White Tiger Ears", "白虎耳"],
    ["Triangle Hat", "三角帽"], ["Growth Potion", "成长药水"],
    ["Backpack Vacuum", "背包吸尘器"], ["Raft", "木筏"],
    ["Cage Trap", "笼陷阱"], ["Kana's Stool", "卡娜的凳子"],
    ["Present Hunt", "礼物狩猎"], ["Santa Event", "圣诞老人事件"],
    ["Reaper Raid", "死神突袭"], ["Reaper Event", "死神事件"],
    ["Survivor type", "幸存者类型"], ["Sex Scene Lock", "H 场景锁定"],
    ["field BGM tracks", "场景背景音乐"], ["BGM tracks", "背景音乐曲目"],
    ["field BGM", "场景背景音乐"], ["background music", "背景音乐"],

    // 装备
    ["Ribbon equipment", "丝带装备"], ["Chest parts", "胸部部件"],
    ["Apparel equipment", "服装装备"], ["Base equipment", "基础装备"],
    ["Body color", "身体颜色"], ["Skin color", "皮肤颜色"],
    ["Nipple color", "乳头颜色"],
    ["Hairstyle", "发型"], ["Hairstyles", "发型"],
    ["Penis color", "阴茎颜色"],
    ["Neck scale values", "脖子缩放值"], ["Neck thickness", "脖子粗细"],
    ["Neck and head scale values", "脖子和头部缩放值"],
    ["Glasses items", "眼镜物品"], ["Glasses", "眼镜"],
    ["Outfit", "服装搭配"], ["Costumes", "服装"],

    // 动作/状态
    ["Dismantling", "拆解"], ["Dismantle Head", "拆除头部"], ["Dismantle", "拆除"],
    ["Milking Machine", "挤奶机"], ["Daruma", "达摩"],
    ["Gallows", "绞刑架"], ["Guillotine", "断头台"],
    ["Hooks", "钩子"], ["Punching Bag", "沙袋"], ["Wooden Horse", "木马"],
    ["Melee attack", "近战攻击"], ["Throw attack", "投掷攻击"],
    ["Heavy attack", "重攻击"], ["Contact damage", "接触伤害"],
    ["Hit detection", "命中检测"], ["Friendly fire", "友军伤害"],
    ["Enemy detection", "敌人检测"], ["Search range", "搜索范围"],
    ["Animation speed", "动画速度"], ["Dance animation", "舞蹈动画"],
    ["Blinking effect", "闪烁效果"],
    ["Visual bugs", "视觉 bug"], ["Visual bug", "视觉 bug"], ["visual bugs", "视觉 bug"],
    ["Texture error", "纹理错误"],

    // 存档/加载
    ["Save file", "存档文件"], ["Save data", "存档数据"],
    ["loaded game", "已加载的游戏"], ["loading save", "加载存档"],
    ["saved game", "已保存的游戏"],

    // 系统
    ["Title screen", "标题画面"], ["Edit mode", "编辑模式"],
    ["Story text", "故事文本"], ["Line breaks", "换行"],
    ["Localization", "本地化"], ["Localization texts", "本地化文本"],
    ["Localization errors", "本地化错误"],
    ["Default version", "默认版本"], ["Default build", "默认版本"],
    ["Beta branch", "Beta 分支"], ["Beta version", "Beta 版本"],
    ["Debug branch", "Debug 分支"], ["Public branch", "公开分支"],
    ["Error handling", "错误处理"], ["Fail-safe", "故障保护"],
    ["OS language settings", "操作系统语言设置"],
    ["Quality setting", "画质设置"],
    ["Unity", "Unity 引擎"], ["Security update", "安全更新"],
    ["Vulnerability fix", "漏洞修复"],
    ["Stage data", "场景数据"],
    ["Environment color", "环境光照"], ["Environment lighting", "环境光照"],
    ["Outdoor configuration", "室外配置"], ["Interiors", "室内"],
    ["House ID", "房屋 ID"], ["House IDs", "房屋 ID"],
    ["Inventory", "物品栏"], ["Backpack", "背包"],
    ["Bag slots", "背包槽位"], ["Chest", "箱子"],
    ["Storage", "存储"], ["Cloth storage", "布料存储"],
    ["Status page", "状态页面"], ["Tooltip", "工具提示"], ["Tooltips", "工具提示"],
    ["UI elements", "界面元素"], ["UI", "界面"],
    ["Substory", "支线剧情"], ["Main Story", "主线故事"],
    ["Continuation of the Main Story", "主线故事续篇"],
    ["NPC menu", "NPC 菜单"],
    ["Commissioned NPCs", "委托 NPC"], ["Companion NPCs", "同伴 NPC"],
    ["Wandering Native", "流浪原住民"],
    ["Wandering NPCs", "漫游 NPC"], ["Roaming NPCs", "漫游 NPC"],
    ["NPCs on the map", "地图上的 NPC"],
    ["Allied NPCs", "友方 NPC"], ["Allies", "友方"],
    ["Followers", "追随者"], ["Follower", "追随者"],
    ["Waiting position", "等待位置"],
    ["Waiting protagonist", "等待中的主角"], ["Waiting protagonists", "等待中的主角们"],
    ["Non-controlled character", "非控制角色"],
    ["Non-controlled protagonist", "非控制的主角"],
    ["Controlled protagonist", "受控主角"],
    ["Character deletion log", "角色删除日志"],
    ["Game data", "游戏数据"],
    ["Event switch", "事件开关"], ["Event icons", "事件图标"],
    ["Ongoing events", "进行中的事件"], ["Event", "事件"],
    ["Quest", "任务"], ["Repeat quest", "重复任务"],
    ["Bridge construction event", "桥梁建设事件"],
    ["Boss battles", "Boss 战"], ["Boss battle", "Boss 战"], ["Boss", "首领"],
    ["Raid", "突袭"], ["Raids", "突袭"],
    ["Soft-lock", "软锁定"], ["Stuck", "卡住"],
    ["Freeze", "卡死"], ["Crash", "崩溃"],
    ["critical bug", "关键 bug"], ["critical bugs", "关键 bug"],
    ["Game freeze", "游戏卡死"],
    ["DLC update button", "DLC 更新按钮"],
    ["DLC is not applied", "DLC 未应用"],
    ["the correct DLC version", "正确的 DLC 版本"],
    ["DLC", "DLC"],
    ["F attack", "F 攻击"],

    // 动词/短语
    ["Fixed an issue where", "修复了以下问题："],
    ["Fixed a bug where", "修复了以下 bug："],
    ["Fixed a bug", "修复了一个 bug"],
    ["Fixed an issue", "修复了一个问题"],
    ["Fixed missing", "修复了缺失的"], ["Fixed incorrect", "修复了错误的"],
    ["Fixed several", "修复了多个"], ["Fixed", "修复了"],
    ["Added a feature to", "新增了功能："],
    ["Added approximately", "新增了约"], ["Added several", "新增了多个"],
    ["Added 2 new animal NPCs", "新增了 2 个新的动物 NPC"],
    ["Added new stage: Underground Mine", "新增了场景：地下矿井"],
    ["Added Restraint support for Female Natives", "新增了对女性原住民的束缚支持"],
    ["Added new field BGM tracks", "新增了场景背景音乐曲目"],
    ["Added several new items", "新增了多种新物品"],
    ["Added new Android applications for:", "新增了以下角色的安卓机器人应用："],
    ["Added Dismantling options for:", "新增了以下角色的拆解选项："],
    ["Added event for the girl captured by the Tribal Boss", "新增了被部落首领捕获的女孩相关事件"],
    ["Added a prototype version of the Visiting feature (local system, no online connection)", "新增了拜访功能的原型版本（本地系统，无需联网）"],
    ["Added error-handling process for when Yona or Male clones remain", "新增了对约娜或男性残留在存档中的错误处理"],
    ["Added fail-safe error handling for cases where loading Workshop NPCs fails.", "新增了对创意工坊 NPC 加载失败的故障保护错误处理。"],
    ["Added damage to Sally's throw attack.", "为萨莉的投掷攻击添加了伤害。"],
    ["Added an equipment preview function in Preview mode.", "在预览模式中新增了装备预览功能。"],
    ["Added a scaling function for Workshop items.", "为创意工坊物品添加了缩放功能。"],
    ["Added special effect to the Toy Hammer", "为玩具锤添加了特殊效果"],
    ["Added an F attack to the Chaos Ring", "为混沌戒指添加了 F 攻击"],
    ["Added", "新增了"],
    ["Adjusted so that", "调整了"], ["Adjusted the", "调整了"], ["Adjusted", "调整了"],
    ["Enabled", "启用了"], ["Removed", "移除了"],
    ["Corrected", "修正了"], ["Implemented", "实施了"], ["Applied", "应用了"],
    ["Made Lulu's corpse carryable", "露露的尸体现在可以搬运了"],
    ["can now be applied to Androids", "现在可以应用于安卓机器人了"],
    ["can now have their body color changed", "现在可以改变身体颜色了"],
    ["can still have sex during pregnancy if they don't have a visible belly", "在怀孕期间如果没有可见的孕肚，仍然可以进行性行为"],
    ["can no longer be entered", "无法再进入"],
    ["can now be expanded with a Pocket", "现在可以用口袋扩展"],
    ["can now use the Pregnancy Accelerator", "现在可以使用怀孕加速器"],
    ["will no longer disappear immediately after reloading the stage", "重新加载场景后不会立即消失"],
    ["will not become hostile and will instead use visiting dialogue", "不会变为敌对状态，而是使用拜访对话"],
    ["is now", "现在是"], ["can now", "现在可以"], ["can be", "可以被"],
    ["no longer", "不再"], ["could not be", "无法被"],
    ["was not displayed", "未显示"], ["was not set", "未设置"],
    ["was not calculated correctly", "计算不正确"],
    ["was not processed correctly", "处理不正确"],
    ["was not applied correctly", "应用不正确"],
    ["was not functioning", "无法正常运作"],
    ["did not display", "未显示"], ["did not appear", "未出现"],
    ["failed to load", "加载失败"], ["fail to load", "加载失败"],
    ["was not reflected", "未反映"],
    ["was not generated correctly", "生成不正确"],
    ["was not applied", "未应用"],
    ["was no longer displayed", "不再显示"],
    ["was no longer functioning", "不再正常运作"],
    ["was not correctly reflected", "未能正确反映"],
    ["had not been rescued", "尚未被救出"],
    ["remain set to", "保持设置为"],
    ["disappear", "消失"], ["disappearing", "消失"], ["invisible", "不可见"],
    ["incorrect", "错误的"],
    ["correctly", "正确地"], ["correct", "正确的"], ["properly", "正确地"],
    ["automatically", "自动地"], ["temporarily", "临时地"],
    ["Manually", "手动"], ["manually", "手动"],
    ["External Content 更新", "📦 外部内容更新"],

    // 特殊短语
    ["Substory between Nami and the male protagonist", "奈米与男主角的支线剧情"],
    ["Substory between Nami and Yona", "奈米与约娜的支线剧情"],
    ["Usable horse (female natives, underground women, and native boss lady)", "可骑乘马匹（女性原住民、地下女性及原住民女首领）"],
    ["Around 20 new items", "约 20 种新道具"],
    ["Approximately 20 new items", "约 20 种新道具"],
    ["Yona × Man events", "约娜 × 男性事件"],
    ["Yona × Male events", "约娜 × 男性事件"],
    ["NPCs born from the Maiden did not have their type properly set", "从少女所生的 NPC 类型设置不正确"],
    ["Yona's pregnancy state was not visually reflected after loading a save", "加载存档后约娜的怀孕状态未能正确显示"],
    ["Yona could become invisible or control could switch to the male protagonist underground", "在地下时约娜可能变得不可见，或控制权可能切换到男主角"],
    ["several", "多个"],
];

TRANSLATIONS.sort((a, b) => b[0].length - a[0].length);

function translate(text) {
    let result = text;
    // 第一轮：精确模式匹配
    for (const [en, zh] of TRANSLATIONS) {
        const escaped = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(escaped, 'g'), zh);
    }

    // 第二轮：清理残留的英文片段
    const cleanups = [
        // 修复重复的修复/新增标记
        [/修复了 修复了/g, '修复了'],
        [/新增了 新增了/g, '新增了'],
        [/调整了 调整了/g, '调整了'],
        // 修复不完整的翻译残留
        [/an issue where /gi, ''],
        [/a bug where /gi, ''],
        [/was not /gi, '未'],
        [/did not /gi, '未'],
        [/could not /gi, '无法'],
        [/does not /gi, '不'],
        [/is not /gi, '不是'],
        [/are not /gi, '不是'],
        [/has been /gi, '已'],
        [/have been /gi, '已'],
        [/will be /gi, '将被'],
        [/would be /gi, '会被'],
        [/may not /gi, '可能不'],
        [/might not /gi, '可能不'],
        [/can no longer /gi, '不再能'],
        [/does no longer /gi, '不再'],
        [/some /gi, '某些'],
        [/other /gi, '其他'],
        [/others /gi, '其他'],
        [/during /gi, '在…期间'],
        [/after /gi, '之后'],
        [/before /gi, '之前'],
        [/when /gi, '当'],
        [/while /gi, '当…时'],
        [/without /gi, '没有'],
        [/within /gi, '在…内'],
        [/between /gi, '之间'],
        [/through /gi, '通过'],
        [/into /gi, '到…中'],
        [/onto /gi, '到…上'],
        [/from /gi, '从'],
        [/with /gi, '用'],
        [/against /gi, '对'],
        [/among /gi, '在…中'],
        [/above /gi, '在…上方'],
        [/below /gi, '在…下方'],
        [/under /gi, '在…下'],
        [/over /gi, '超过'],
        [/behind /gi, '在…后'],
        [/next to /gi, '在…旁边'],
        [/inside /gi, '在…里面'],
        [/outside /gi, '在…外面'],
        [/because /gi, '因为'],
        [/however /gi, '然而'],
        [/therefore /gi, '因此'],
        [/instead /gi, '改为'],
        [/also /gi, '也'],
        [/already /gi, '已经'],
        [/always /gi, '始终'],
        [/never /gi, '从不'],
        [/only /gi, '仅'],
        [/just /gi, '刚刚'],
        [/still /gi, '仍然'],
        [/now /gi, '现在'],
        [/then /gi, '然后'],
        [/later /gi, '稍后'],
        [/earlier /gi, '之前'],
        [/recently /gi, '最近'],
        [/usually /gi, '通常'],
        [/sometimes /gi, '有时'],
        [/often /gi, '经常'],
        [/rarely /gi, '很少'],
        [/once /gi, '一旦'],
        [/twice /gi, '两次'],
        [/again /gi, '再次'],
        [/first /gi, '首先'],
        [/second /gi, '其次'],
        [/third /gi, '第三'],
        [/finally /gi, '最后'],
        [/each /gi, '每个'],
        [/every /gi, '每个'],
        [/any /gi, '任何'],
        [/all /gi, '所有'],
        [/most /gi, '大多数'],
        [/few /gi, '少数'],
        [/many /gi, '许多'],
        [/more /gi, '更多'],
        [/less /gi, '更少'],
        [/enough /gi, '足够'],
        [/same /gi, '相同'],
        [/different /gi, '不同'],
        [/similar /gi, '类似'],
        [/possible /gi, '可能'],
        [/impossible /gi, '不可能'],
        [/available /gi, '可用'],
        [/unavailable /gi, '不可用'],
        [/visible /gi, '可见'],
        [/invisible /gi, '不可见'],
        [/complete /gi, '完成'],
        [/incomplete /gi, '未完成'],
        [/successful /gi, '成功'],
        [/unsuccessful /gi, '失败'],
        [/previous /gi, '之前的'],
        [/next /gi, '下一个'],
        [/current /gi, '当前'],
        [/new /gi, '新的'],
        [/old /gi, '旧的'],
        [/large /gi, '大'],
        [/small /gi, '小'],
        [/medium /gi, '中'],
        [/high /gi, '高'],
        [/low /gi, '低'],
        [/upper /gi, '上'],
        [/lower /gi, '下'],
        [/left /gi, '左'],
        [/right /gi, '右'],
        [/front /gi, '前'],
        [/back /gi, '后'],
        [/top /gi, '顶部'],
        [/bottom /gi, '底部'],
        [/center /gi, '中心'],
        [/edge /gi, '边缘'],
        [/side /gi, '侧'],
        [/corner /gi, '角落'],
        [/middle /gi, '中间'],
        [/beginning /gi, '开头'],
        [/end /gi, '结尾'],
        [/start /gi, '开始'],
        [/stop /gi, '停止'],
        [/continue /gi, '继续'],
        [/pause /gi, '暂停'],
        [/resume /gi, '恢复'],
        [/restart /gi, '重启'],
        [/reset /gi, '重置'],
        [/enable /gi, '启用'],
        [/disable /gi, '禁用'],
        [/activate /gi, '激活'],
        [/deactivate /gi, '停用'],
        [/add /gi, '添加'],
        [/remove /gi, '移除'],
        [/delete /gi, '删除'],
        [/create /gi, '创建'],
        [/destroy /gi, '销毁'],
        [/build /gi, '建造'],
        [/rebuild /gi, '重建'],
        [/place /gi, '放置'],
        [/replace /gi, '替换'],
        [/move /gi, '移动'],
        [/copy /gi, '复制'],
        [/paste /gi, '粘贴'],
        [/duplicate /gi, '复制'],
        [/merge /gi, '合并'],
        [/split /gi, '拆分'],
        [/combine /gi, '组合'],
        [/separate /gi, '分离'],
        [/attach /gi, '附加'],
        [/detach /gi, '分离'],
        [/connect /gi, '连接'],
        [/disconnect /gi, '断开'],
        [/link /gi, '链接'],
        [/unlink /gi, '取消链接'],
        [/open /gi, '打开'],
        [/close /gi, '关闭'],
        [/show /gi, '显示'],
        [/hide /gi, '隐藏'],
        [/appear /gi, '出现'],
        [/disappear /gi, '消失'],
        [/enter /gi, '进入'],
        [/exit /gi, '退出'],
        [/return /gi, '返回'],
        [/leave /gi, '离开'],
        [/stay /gi, '停留'],
        [/go /gi, '去'],
        [/come /gi, '来'],
        [/bring /gi, '带来'],
        [/take /gi, '拿走'],
        [/give /gi, '给予'],
        [/receive /gi, '接收'],
        [/send /gi, '发送'],
        [/get /gi, '获取'],
        [/set /gi, '设置'],
        [/put /gi, '放入'],
        [/pull /gi, '拉'],
        [/push /gi, '推'],
        [/hold /gi, '持'],
        [/release /gi, '释放'],
        [/drop /gi, '丢弃'],
        [/pick /gi, '拾取'],
        [/collect /gi, '收集'],
        [/gather /gi, '采集'],
        [/harvest /gi, '收获'],
        [/plant /gi, '种植'],
        [/grow /gi, '生长'],
        [/water /gi, '浇水'],
        [/feed /gi, '喂食'],
        [/eat /gi, '吃'],
        [/drink /gi, '喝'],
        [/cook /gi, '烹饪'],
        [/craft /gi, '制作'],
        [/repair /gi, '修理'],
        [/upgrade /gi, '升级'],
        [/enhance /gi, '增强'],
        [/improve /gi, '改进'],
        [/change /gi, '更改'],
        [/modify /gi, '修改'],
        [/adjust /gi, '调整'],
        [/tweak /gi, '微调'],
        [/rework /gi, '重做'],
        [/overhaul /gi, '大改'],
        [/refactor /gi, '重构'],
        [/optimize /gi, '优化'],
        [/reduce /gi, '减少'],
        [/increase /gi, '增加'],
        [/expand /gi, '扩展'],
        [/shrink /gi, '缩小'],
        [/grow /gi, '增长'],
        [/decrease /gi, '减少'],
        [/double /gi, '翻倍'],
        [/triple /gi, '三倍'],
        [/half /gi, '减半'],
        [/full /gi, '满'],
        [/empty /gi, '空'],
        [/empty /gi, '空'],
        // 时间相关
        [/immediately /gi, '立即'],
        [/instantly /gi, '立即'],
        [/eventually /gi, '最终'],
        [/finally /gi, '终于'],
        [/suddenly /gi, '突然'],
        [/gradually /gi, '逐渐'],
        [/slowly /gi, '慢慢地'],
        [/quickly /gi, '快速地'],
        [/rapidly /gi, '快速地'],
        [/in order to /gi, '为了'],
        [/so that /gi, '以便'],
        [/due to /gi, '由于'],
        [/because of /gi, '因为'],
        [/instead of /gi, '代替'],
        [/rather than /gi, '而不是'],
        [/such as /gi, '例如'],
        [/for example /gi, '例如'],
        [/including /gi, '包括'],
        [/especially /gi, '尤其是'],
        [/particularly /gi, '特别是'],
        [/at least /gi, '至少'],
        [/at most /gi, '最多'],
        [/up to /gi, '最多'],
        [/more than /gi, '超过'],
        [/less than /gi, '少于'],
        [/except for /gi, '除了'],
        [/other than /gi, '除了'],
        [/along with /gi, '以及'],
        [/together with /gi, '连同'],
        [/as well as /gi, '以及'],
        [/in addition /gi, '此外'],
        [/on top of /gi, '除了…之外'],
        [/in total /gi, '总共'],
        [/per /gi, '每'],
        [/each time /gi, '每次'],
        [/every time /gi, '每次'],
        [/no longer /gi, '不再'],
        [/not yet /gi, '尚未'],
        [/not enough /gi, '不足'],
        [/too many /gi, '太多'],
        [/too much /gi, '太多'],
        [/too few /gi, '太少'],
        [/as soon as /gi, '一…就'],
        [/as long as /gi, '只要'],
        [/even if /gi, '即使'],
        [/even though /gi, '尽管'],
        [/no matter /gi, '无论'],
        [/regardless of /gi, '不管'],
        [/in case /gi, '以防'],
        [/in case of /gi, '如果发生'],
        [/in order /gi, '按顺序'],
        [/random /gi, '随机'],
        [/specific /gi, '特定'],
        [/certain /gi, '某些'],
        [/particular /gi, '特定'],
        [/general /gi, '通用'],
        [/common /gi, '常见'],
        [/rare /gi, '稀有'],
        [/unique /gi, '唯一'],
        [/special /gi, '特殊'],
        [/normal /gi, '正常'],
        [/abnormal /gi, '异常'],
        [/regular /gi, '普通'],
        [/irregular /gi, '不规则'],
        [/basic /gi, '基础'],
        [/advanced /gi, '高级'],
        [/simple /gi, '简单'],
        [/complex /gi, '复杂'],
        [/easy /gi, '简单'],
        [/hard /gi, '困难'],
        [/difficult /gi, '困难'],
        [/challenging /gi, '有挑战性'],
        [/annoying /gi, '令人困扰的'],
        [/convenient /gi, '方便的'],
        // 特殊名词
        [/riots?/gi, '暴动'],
        [/workplaces?/gi, '工作场所'],
        [/hydration/gi, '水分'],
        [/nutrition/gi, '营养'],
        [/facility/gi, '设施'],
        [/facilities/gi, '设施'],
        [/compatibility/gi, '兼容性'],
        [/compatible/gi, '兼容'],
        [/expression/gi, '表情'],
        [/layer/gi, '层'],
        [/slash/gi, '斩击'],
        [/effects?/gi, '效果'],
        [/appearance/gi, '外观'],
        [/variations?/gi, '变体'],
        [/training/gi, '训练'],
        [/obtainable/gi, '可获取的'],
        [/External Content Update/gi, '📦 外部内容更新'],
        [/external data/gi, '外部数据'],
        [/For more details, please check the official Discord or other channels\\./gi, '更多详情请查看官方 Discord 或其他频道。'],
        [/New H-Scenes/gi, '🆕 新增 H 场景'],
        [/These H-scenes become available after completing the newly added storylines\\./gi, '这些 H 场景在完成新增剧情后解锁。'],
        [/External Data Update/gi, '📦 外部数据更新'],
        [/Additional compatible NPCs/gi, '额外兼容的 NPC'],
        [/added support/gi, '添加了支持'],
        // 兜底清理
        [/\bthe\b/gi, ''],
        [/\ba\b(?=\s+[a-zA-Z])/gi, ''],
        [/\ban\b(?=\s+[a-zA-Z])/gi, ''],
        // 多余的空白
        [/ {2,}/g, ' '],
        [/\n{3,}/g, '\n\n'],
    ];

    for (const [pattern, replacement] of cleanups) {
        result = result.replace(pattern, replacement);
    }

    // 格式清理
    result = result.replace(/^■\s*/gm, '');
    result = result.replace(/^[-–—]\s*/gm, '· ');
    // 修复多余的标点
    result = result.replace(/\.{2,}/g, '.');
    result = result.replace(/,{2,}/g, ',');
    // 修复中文前后多余空格
    result = result.replace(/([一-龥])\s+([一-龥])/g, '$1$2');
    // 修复括号内多余空格
    result = result.replace(/\(\s+/g, '(');
    result = result.replace(/\s+\)/g, ')');

    return result.trim();
}

// ==================== 带重试的 API 调用 ====================

function fetchUpdates(retries = MAX_RETRIES) {
    return new Promise((resolve, reject) => {
        function attempt(n) {
            const req = https.get(API_URL, {
                headers: { "User-Agent": "MadIslandTracker/2.0" },
                timeout: 15000
            }, (res) => {
                let body = "";
                res.on("data", chunk => body += chunk);
                res.on("end", () => {
                    try {
                        const data = JSON.parse(body);
                        if (!data.appnews || !Array.isArray(data.appnews.newsitems)) {
                            throw new Error("API 返回格式异常");
                        }
                        resolve(data.appnews.newsitems);
                    } catch (e) {
                        if (n > 1) {
                            log("WARN", `API 解析失败 (剩余重试 ${n - 1}): ${e.message}`);
                            setTimeout(() => attempt(n - 1), RETRY_DELAY_MS);
                        } else {
                            reject(new Error(`API 解析最终失败: ${e.message}`));
                        }
                    }
                });
            });
            req.on("timeout", () => { req.destroy(); if (n > 1) { log("WARN", `请求超时 (剩余重试 ${n - 1})`); setTimeout(() => attempt(n - 1), RETRY_DELAY_MS); } else reject(new Error("请求超时，已达最大重试次数")); });
            req.on("error", (e) => { if (n > 1) { log("WARN", `网络错误 (剩余重试 ${n - 1}): ${e.message}`); setTimeout(() => attempt(n - 1), RETRY_DELAY_MS); } else reject(new Error(`网络错误: ${e.message}`)); });
        }
        attempt(retries);
    });
}

// ==================== 文件操作 ====================

function loadTracked() {
    try {
        if (fs.existsSync(TRACK_FILE)) {
            const data = JSON.parse(fs.readFileSync(TRACK_FILE, "utf-8"));
            if (Array.isArray(data.tracked_gids)) return data;
        }
    } catch (e) { log("WARN", `追踪文件损坏: ${e.message}`); }
    return { tracked_gids: [], last_check: null };
}

function saveTracked(tracked) {
    fs.writeFileSync(TRACK_FILE, JSON.stringify(tracked, null, 2), "utf-8");
}

function loadLocalCache() {
    if (!fs.existsSync(DATA_FILE)) return null;
    try {
        const cached = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
        if (cached.appnews && Array.isArray(cached.appnews.newsitems)) {
            return cached.appnews.newsitems;
        }
    } catch (e) { /* ignore */ }
    return null;
}

function saveLocalCache(updates) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
        appnews: { appid: APP_ID, newsitems: updates }
    }, null, 2), "utf-8");
}

// ==================== 时间工具 ====================

function toBeijingTime(unixTimestamp) {
    const d = new Date(unixTimestamp * 1000);
    d.setHours(d.getHours() + 8);
    return d;
}

function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}`;
}

// ==================== 格式化 ====================

function formatUpdate(item) {
    const title = item.title || "";
    const date = toBeijingTime(item.date);
    const author = item.author || "";
    const contents = item.contents || "";
    const url = item.url || "";

    let md = `### ${translate(title)}\n\n`;
    md += `- **日期**：${formatDate(date)}（北京时间）\n`;
    md += `- **原始标题**：${title}\n`;
    if (author) md += `- **作者**：${author}\n`;
    md += `- **链接**：[Steam 公告](${url})\n\n`;
    md += `${translate(contents)}\n\n`;
    md += "---\n\n";
    return md;
}

function generateFullHistory(updates) {
    const filtered = updates
        .filter(item => item.date >= CUTOFF_TIMESTAMP)
        .sort((a, b) => b.date - a.date);

    const groups = new Map();
    for (const item of filtered) {
        const d = toBeijingTime(item.date);
        const ym = `${d.getFullYear()} 年 ${String(d.getMonth() + 1).padStart(2, '0')} 月`;
        if (!groups.has(ym)) groups.set(ym, []);
        groups.get(ym).push(item);
    }

    let md = `# Mad Island（疯狂岛 / 生存游戏）更新日志\n\n`;
    md += `本文件自动从 Steam 官方 API 生成，覆盖 **2024 年 12 月** 至今的所有更新公告。\n\n`;
    md += `- **生成时间**：${formatDate(toBeijingTime(Math.floor(Date.now() / 1000)))}（北京时间）\n`;
    md += `- **Steam 商店**：[Mad Island](https://store.steampowered.com/app/${APP_ID})\n`;
    md += `- **总计更新数**：${filtered.length} 条\n`;
    md += `- **追踪脚本**：\`mad-island-tracker.js\`（每 6 小时自动检查）\n\n`;
    md += "---\n\n";

    md += "## 目录\n\n";
    for (const [ym, items] of groups) {
        md += `- [${ym}](#${ym.replace(/\s+/g, '-')})（${items.length} 条）\n`;
    }
    md += "\n---\n\n";

    for (const [ym, items] of groups) {
        md += `## ${ym}（${items.length} 条更新）\n\n`;
        for (const item of items) {
            md += formatUpdate(item);
        }
    }

    fs.writeFileSync(OUTPUT_FILE, md, "utf-8");
    log("INFO", `完整历史已生成: ${OUTPUT_FILE}`);
    return { count: filtered.length, months: groups.size };
}

function checkNewUpdates(updates) {
    const tracked = loadTracked();
    const trackedGids = new Set(tracked.tracked_gids);

    let newItems = updates.filter(item => !trackedGids.has(item.gid));
    newItems = newItems.filter(item => item.date >= CUTOFF_TIMESTAMP);
    newItems.sort((a, b) => a.date - b.date);

    if (newItems.length === 0) return { count: 0, items: [] };

    let md = `\n## 新增更新（${formatDate(toBeijingTime(Math.floor(Date.now() / 1000)))}）\n\n`;
    for (const item of newItems) md += formatUpdate(item);

    if (fs.existsSync(OUTPUT_FILE)) {
        fs.appendFileSync(OUTPUT_FILE, md, "utf-8");
    } else {
        // 输出文件不存在则生成完整的
        generateFullHistory(updates);
    }

    for (const item of newItems) tracked.tracked_gids.push(item.gid);
    tracked.last_check = new Date().toISOString();
    saveTracked(tracked);

    log("INFO", `发现 ${newItems.length} 条新更新并已追加`);
    return { count: newItems.length, items: newItems };
}

// ==================== 自检系统 ====================

function selfCheck(updates) {
    const results = [];
    let pass = true;

    // 1. API 连接检查
    if (updates && updates.length > 0) {
        results.push({ check: "Steam API 连接", status: "PASS", detail: `获取到 ${updates.length} 条公告` });
    } else {
        results.push({ check: "Steam API 连接", status: "FAIL", detail: "未能获取到任何公告数据" });
        pass = false;
    }

    // 2. 数据新鲜度检查
    if (updates && updates.length > 0) {
        const latestUpdate = Math.max(...updates.map(u => u.date));
        const hoursAgo = (Date.now() / 1000 - latestUpdate) / 3600;
        if (hoursAgo < STALE_HOURS) {
            results.push({ check: "数据新鲜度", status: "PASS", detail: `最新更新距今 ${hoursAgo.toFixed(1)} 小时` });
        } else {
            results.push({ check: "数据新鲜度", status: "WARN", detail: `最新更新距今 ${hoursAgo.toFixed(1)} 小时，请注意 API 是否被限制` });
        }
    }

    // 3. 输出文件检查
    if (fs.existsSync(OUTPUT_FILE)) {
        const stat = fs.statSync(OUTPUT_FILE);
        const sizeKB = (stat.size / 1024).toFixed(1);
        const hoursAgo = (Date.now() - stat.mtimeMs) / 3600000;
        if (hoursAgo < 72) {
            results.push({ check: "输出文件", status: "PASS", detail: `${sizeKB} KB，最后修改距今 ${hoursAgo.toFixed(1)} 小时` });
        } else {
            results.push({ check: "输出文件", status: "WARN", detail: `${sizeKB} KB，最后修改距今 ${hoursAgo.toFixed(0)} 小时（超过 3 天）` });
        }
    } else {
        results.push({ check: "输出文件", status: "FAIL", detail: "mad-island-updates.md 不存在" });
        pass = false;
    }

    // 4. 缓存文件检查
    if (fs.existsSync(DATA_FILE)) {
        const stat = fs.statSync(DATA_FILE);
        results.push({ check: "缓存文件", status: "PASS", detail: `${(stat.size / 1024).toFixed(1)} KB` });
    } else {
        results.push({ check: "缓存文件", status: "WARN", detail: "mad-island-updates-raw.json 不存在" });
    }

    // 5. 追踪文件检查
    if (fs.existsSync(TRACK_FILE)) {
        try {
            const tracked = JSON.parse(fs.readFileSync(TRACK_FILE, "utf-8"));
            results.push({ check: "追踪记录", status: "PASS", detail: `已追踪 ${tracked.tracked_gids?.length || 0} 条` });
        } catch (e) {
            results.push({ check: "追踪记录", status: "FAIL", detail: "文件损坏" });
            pass = false;
        }
    } else {
        results.push({ check: "追踪记录", status: "WARN", detail: "不存在（首次运行后自动创建）" });
    }

    // 6. Node.js 环境检查
    const nodeVersion = process.version;
    results.push({ check: "Node.js 环境", status: "PASS", detail: `v${nodeVersion}` });

    // 7. 文件权限检查
    try {
        const testFile = path.join(BASE_DIR, ".write_test");
        fs.writeFileSync(testFile, "test");
        fs.unlinkSync(testFile);
        results.push({ check: "文件写入权限", status: "PASS", detail: "OK" });
    } catch (e) {
        results.push({ check: "文件写入权限", status: "FAIL", detail: e.message });
        pass = false;
    }

    // 8. 翻译覆盖度
    let untranslatedCount = 0;
    if (updates) {
        for (const item of updates.slice(0, 10)) {
            const translated = translate(item.contents || "");
            const engWords = translated.match(/[a-zA-Z]{4,}/g) || [];
            untranslatedCount += engWords.length;
        }
        if (untranslatedCount > 50) {
            results.push({ check: "翻译覆盖度", status: "WARN", detail: `前 10 条约 ${untranslatedCount} 个未翻译英文词` });
        } else {
            results.push({ check: "翻译覆盖度", status: "PASS", detail: `前 10 条约 ${untranslatedCount} 个未翻译英文词` });
        }
    }

    return { pass, results };
}

// ==================== JSON 数据文件（供 index.html 读取） ====================

const JSON_FILE = path.join(BASE_DIR, "updates.json");
const JS_DATA_FILE = path.join(BASE_DIR, "data.js");
const ZH_TRANSLATIONS_FILE = path.join(BASE_DIR, "zh-translations.json");

function loadManualTranslations() {
    try {
        if (fs.existsSync(ZH_TRANSLATIONS_FILE)) {
            return JSON.parse(fs.readFileSync(ZH_TRANSLATIONS_FILE, "utf-8"));
        }
    } catch (e) { log("WARN", `翻译文件加载失败: ${e.message}`); }
    return {};
}

// ==================== Google 翻译 API（免费端点） ====================

async function translateViaAPI(text) {
    if (!text || text.length < 5) return text;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
    try {
        const resp = await new Promise((resolve, reject) => {
            https.get(url, { headers: { "User-Agent": "MadIslandTracker/2.0" }, timeout: 10000 }, (res) => {
                let body = "";
                res.on("data", c => body += c);
                res.on("end", () => resolve(body));
            }).on("error", reject);
        });
        const parsed = JSON.parse(resp);
        if (parsed && parsed[0]) {
            return parsed[0].map(part => part[0]).join("");
        }
    } catch (e) {
        log("WARN", `翻译 API 失败: ${e.message}`);
    }
    return null;
}

async function smartTranslate(text) {
    // 先尝试 Google 翻译 API
    const apiResult = await translateViaAPI(text);
    if (apiResult && apiResult.trim().length > text.length * 0.3) {
        return apiResult.trim();
    }
    // 回退到模式匹配翻译
    return translate(text);
}

async function generateJSON(updates) {
    const manual = loadManualTranslations();
    const filtered = updates
        .filter(item => item.date >= CUTOFF_TIMESTAMP)
        .sort((a, b) => b.date - a.date);

    // 找出需要 API 翻译的条目
    const needTranslate = filtered.filter(item => !manual[item.gid]);
    if (needTranslate.length > 0) {
        log("INFO", `${needTranslate.length} 条无人工翻译，尝试 API 翻译...`);
        for (const item of needTranslate) {
            const zh = await smartTranslate(item.contents || "");
            if (zh) manual[item.gid] = zh;
        }
        // 保存翻译结果
        try {
            fs.writeFileSync(ZH_TRANSLATIONS_FILE, JSON.stringify(manual, null, 2), "utf-8");
            log("INFO", `翻译已保存到 ${ZH_TRANSLATIONS_FILE}`);
        } catch (e) { log("WARN", `翻译保存失败: ${e.message}`); }
    }

    const items = filtered.map(item => {
        const hasManual = !!manual[item.gid];
        const ce = item.contents || "";
        const isAd = /H [Ss]cene|[Ss]ex|[Pp]regnant|[Bb]reed|[Mm]ilk|[Bb]ondage|[Rr]estraint|[Gg]allows|[Gg]uillotine|[Hh]ooks|[Ww]ooden [Hh]orse|[Pp]unching [Bb]ag|[Dd]ismantling|[Aa]bortion|[Cc]ontraceptive|[Ll]ust|[Pp]erfume|[Aa]phrodisiac|NTR|harem|forced/i.test(ce);
        return {
            adult: isAd,
            gid: item.gid,
            title: hasManual ? (item.title || "") : translate(item.title || ""),
            title_en: item.title || "",
            date: item.date,
            date_str: formatDate(toBeijingTime(item.date)),
            author: item.author || "",
            content: manual[item.gid] || translate(item.contents || ""),
            content_en: item.contents || "",
            url: item.url || "",
            type: categorizeItem(item),
            manual: hasManual
        };
    });

    const manualCount = items.filter(i => i.manual).length;
    const output = {
        app_id: APP_ID,
        generated_at: new Date().toISOString(),
        total: items.length,
        manual_translated: manualCount,
        items
    };

    // JSON 文件（备用）
    fs.writeFileSync(JSON_FILE, JSON.stringify(output, null, 2), "utf-8");

    // JS 文件（主要：通过 <script> 标签加载，兼容 file:// 协议）
    const jsContent = `// Mad Island 更新数据 — 由追踪脚本自动生成\n// 生成时间：${new Date().toISOString()}\nwindow.MAD_DATA = ${JSON.stringify(output, null, 2)};\n`;
    fs.writeFileSync(JS_DATA_FILE, jsContent, "utf-8");

    log("INFO", `数据文件已生成: ${JSON_FILE}, ${JS_DATA_FILE}`);
    return items.length;
}

// ==================== 表格模式 ====================

const TABLE_FILE = path.join(BASE_DIR, "mad-island-table.md");

function categorizeItem(item) {
    const title = item.title || "";
    const content = item.contents || "";

    // 判断类型：主要看是否有大量新增内容
    const hasAdditions = /Additions|New H Scenes|New Features|Added H Content/i.test(content);
    const hasStory = /Main Story|Substory|Continuation/i.test(content);
    const additions = content.match(/[-–—•]\s*([^-\n]{10,})/g) || [];
    const significantAdditions = additions.filter(a => a.length > 30).length;

    if (/hotfix|Hotfix/i.test(title) && content.length < 300) return "🔴 热修复";
    if (/hotfix|urgent/i.test(content) && significantAdditions === 0) return "🔴 热修复";
    if (significantAdditions >= 3 || hasStory) return "🟢 主要内容";
    if (hasAdditions) return "🔵 小更新";
    return "🟡 Bug修复";
}

function extractSummary(item) {
    // 先翻译再提取
    const zh = translate(item.contents || "");
    const lines = zh.split(/[\n■●]/).filter(Boolean);
    const points = [];

    for (const line of lines) {
        const trimmed = line.replace(/^[-–—•]\s*/, '').trim();
        // 跳过太短、太长、纯格式的行
        if (trimmed.length < 6 || trimmed.length > 150) continue;
        if (/^(点击|更多|详情|详见|默认版本|Beta|This|To play|Please|For more|External|If you)/i.test(trimmed)) continue;
        // 收集有意义的行
        if (/[一-龥]/.test(trimmed)) {
            // 优先中文行
            points.push(trimmed);
        } else if (points.length === 0) {
            points.push(trimmed);
        }
        if (points.length >= 3) break;
    }

    if (points.length === 0) {
        points.push(zh.replace(/\n/g, ' ').substring(0, 100));
    }

    return points;
}

function generateTable(updates) {
    const filtered = updates
        .filter(item => item.date >= CUTOFF_TIMESTAMP)
        .sort((a, b) => a.date - b.date);

    // 统计
    const stats = { content: 0, minor: 0, hotfix: 0, bugfix: 0 };
    for (const item of filtered) {
        const type = categorizeItem(item);
        if (type.startsWith("🟢")) stats.content++;
        else if (type.startsWith("🔵")) stats.minor++;
        else if (type.startsWith("🔴")) stats.hotfix++;
        else stats.bugfix++;
    }

    let md = `# Mad Island 更新速览表\n\n`;
    md += `自动从 Steam 官方 API 生成 | 生成时间：${formatDate(toBeijingTime(Math.floor(Date.now() / 1000)))}（北京时间）\n\n`;
    md += `> 🟢 主要内容 ${stats.content} | 🔵 小更新 ${stats.minor} | 🟡 Bug修复 ${stats.bugfix} | 🔴 热修复 ${stats.hotfix} | 共 ${filtered.length} 条\n\n`;

    let currentMonth = "";
    for (const item of filtered) {
        const d = toBeijingTime(item.date);
        const dateStr = formatDate(d);
        const ym = dateStr.substring(0, 7);
        const version = (item.title || "").replace(/^update\s*/i, "");
        const type = categorizeItem(item);
        const summary = extractSummary(item);
        const content = summary.join("<br>");

        // 月份分隔行
        if (ym !== currentMonth) {
            currentMonth = ym;
            md += `\n### ${ym}\n\n`;
            md += `| 日期 | 版本 | 类型 | 主要内容 |\n`;
            md += `|------|------|------|----------|\n`;
        }

        md += `| ${dateStr} | ${version} | ${type} | ${content} |\n`;
    }

    fs.writeFileSync(TABLE_FILE, md, "utf-8");
    log("INFO", `表格已生成: ${TABLE_FILE}`);
    return { count: filtered.length, stats };
}

// ==================== 主流程 ====================

async function main() {
    const args = process.argv.slice(2);
    const isFull = args.includes("--full");
    const isCheck = args.includes("--check");
    const isStatus = args.includes("--status");
    const isTable = args.includes("--table");

    log("INFO", `启动 (模式: ${isFull ? "full" : isCheck ? "check" : isStatus ? "status" : "incremental"})`);

    // 获取数据（带重试）
    let updates = null;
    let apiOk = false;
    try {
        updates = await fetchUpdates();
        apiOk = true;
        log("INFO", `API 获取成功: ${updates.length} 条公告`);
        saveLocalCache(updates);
    } catch (e) {
        log("ERROR", `API 获取失败: ${e.message}`);
        updates = loadLocalCache();
        if (updates) {
            log("WARN", `已降级使用本地缓存: ${updates.length} 条`);
        }
    }

    // --status 模式：输出 JSON 状态
    if (isStatus) {
        const tracked = loadTracked();
        const status = {
            app_id: APP_ID,
            timestamp: new Date().toISOString(),
            api_reachable: apiOk,
            total_news_items: updates ? updates.length : 0,
            tracked_gids: tracked.tracked_gids?.length || 0,
            last_check: tracked.last_check || null,
            latest_update: updates ? formatDate(toBeijingTime(Math.max(...updates.map(u => u.date)))) : null,
            output_file_exists: fs.existsSync(OUTPUT_FILE),
            output_file_size_kb: fs.existsSync(OUTPUT_FILE) ? (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1) : null,
            cache_file_exists: fs.existsSync(DATA_FILE),
            self_check: updates ? selfCheck(updates) : { pass: false, results: [{ check: "数据", status: "FAIL", detail: "无数据" }] }
        };
        console.log(JSON.stringify(status, null, 2));
        return;
    }

    // 无数据则退出
    if (!updates) {
        log("ERROR", "无可用数据，退出");
        process.exit(1);
    }

    // 始终更新 JSON 数据文件（供 index.html 本地读取）
    const jsonCount = await generateJSON(updates);
    console.log(`📦 JSON 数据已更新：${jsonCount} 条`);

    // --table 模式：生成简洁表格
    if (isTable) {
        console.log("📊 生成简洁表格...");
        const result = generateTable(updates);
        console.log(`✅ 已生成：${TABLE_FILE}`);
        console.log(`   - 共 ${result.count} 条更新`);
        return;
    }

    // --check 模式：只诊断
    if (isCheck) {
        console.log("\n🔍 Mad Island 追踪器自检报告\n");
        console.log("=".repeat(50));
        const { pass, results } = selfCheck(updates);
        for (const r of results) {
            const icon = r.status === "PASS" ? "✅" : r.status === "WARN" ? "⚠️" : "❌";
            console.log(`${icon} ${r.check}: ${r.detail}`);
        }
        console.log("=".repeat(50));
        console.log(pass ? "\n✅ 自检通过，追踪系统运行正常。" : "\n❌ 自检发现问题，请检查上述项。");

        // 更新追踪文件时间
        const tracked = loadTracked();
        tracked.last_check = new Date().toISOString();
        saveTracked(tracked);

        if (!pass) process.exit(1);
        return;
    }

    // --full 或首次运行
    if (isFull || !fs.existsSync(OUTPUT_FILE)) {
        console.log("🔄 生成完整更新历史...");
        const result = generateFullHistory(updates);
        console.log(`✅ 已生成：${OUTPUT_FILE}`);
        console.log(`   - 共 ${result.count} 条更新`);
        console.log(`   - 覆盖 ${result.months} 个月`);
    } else {
        const result = checkNewUpdates(updates);
        if (result.count === 0) {
            console.log("✅ 没有新更新。");
            const tracked = loadTracked();
            tracked.last_check = new Date().toISOString();
            saveTracked(tracked);
        } else {
            console.log(`🆕 发现 ${result.count} 条新更新！`);
            for (const item of result.items) {
                const d = toBeijingTime(item.date);
                console.log(`   - [${formatDate(d)}] ${translate(item.title)}`);
            }
        }
    }

    // 输出最新更新
    const recent = updates
        .filter(item => item.date >= CUTOFF_TIMESTAMP)
        .sort((a, b) => b.date - a.date)
        .slice(0, 3);
    console.log("\n📌 最近 3 条更新：");
    for (const item of recent) {
        const d = toBeijingTime(item.date);
        console.log(`   [${formatDate(d)}] ${translate(item.title)}`);
    }

    // 静默自检
    const { pass } = selfCheck(updates);
    if (!pass) {
        console.log("\n⚠️ 自检发现问题，建议运行 `node mad-island-tracker.js --check` 查看详情。");
    }

    log("INFO", "运行完成");
}

main().catch(e => { log("FATAL", e.message); console.error(e); process.exit(1); });

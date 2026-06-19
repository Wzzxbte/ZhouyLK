#!/usr/bin/env python3
"""
Mad Island 更新追踪器
从 Steam API 拉取更新公告，翻译成中文，保存为 Markdown 文件。
首次运行生成完整历史，后续运行只追加新更新。

用法：
  python mad-island-tracker.py          # 检查并追加新更新
  python mad-island-tracker.py --full   # 重新生成完整历史
"""

import json
import os
import sys
import urllib.request
import time
from datetime import datetime, timezone, timedelta

APP_ID = "2739590"
API_URL = f"https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid={APP_ID}&count=100&maxlength=2000&format=json"
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mad-island-updates-raw.json")
OUTPUT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mad-island-updates.md")
TRACK_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mad-island-tracked.json")

# 翻译映射表：常见游戏术语和更新类型
TRANSLATIONS = {
    # 版本说明
    "Beta Version Notice": "Beta 版本说明",
    "This version requires opting into the beta branch to play.": "此版本需切换到 beta 分支才能游玩。",
    "Please note that stability is not guaranteed, and we strongly recommend using a separate save file when playing this version.": "请注意稳定性不保证，强烈建议使用独立的存档文件进行游玩。",
    "To play this version, you need to switch to the beta branch.": "要游玩此版本，需切换到 beta 分支。",
    "To play this version, you must switch the game to the beta branch.": "要游玩此版本，必须将游戏切换到 beta 分支。",
    "Due to many changes that may affect game data, please make sure to use a separate save file.": "由于许多改动可能影响游戏数据，请务必使用独立的存档文件。",
    "As it may be unstable, we recommend keeping a separate save file when playing.": "由于可能不稳定，建议游玩时保留独立的存档文件。",
    "Hotfix": "热修复",
    "We have fixed a critical bug.": "修复了一个关键 bug。",
    "We fixed a critical bug.": "修复了一个关键 bug。",
    "We identified a critical bug and have released an urgent hotfix.": "发现了一个关键 bug，已发布紧急热修复。",
    "Several critical bugs have been fixed.": "修复了多个关键 bug。",
    "Several bug fixes have been implemented.": "实施了多项 bug 修复。",
    "Several bug fixes have been implemented.": "实施了多项 bug 修复。",
    "Bug Fixes": "Bug 修复",
    "Bug Fix": "Bug 修复",
    "Bug Fixes & Adjustments": "Bug 修复与调整",
    "Several critical bugs have been prioritized and fixed.": "优先修复了多个关键 bug。",
    "Several gameplay-blocking bugs have been fixed.": "修复了多个阻碍游戏进程的 bug。",
    "We've released an emergency update to address a critical bug.": "发布了紧急更新以解决关键 bug。",
    "The stuck bug has been fixed, and the version has been updated to v0.2.7.": "卡住 bug 已修复，版本已更新至 v0.2.7。",
    "We sincerely apologize for the inconvenience caused by the stacking bug that occurred in the latest update (v0.2.7). The issue resulted in players getting stuck after actions like cutting down trees, prompting us to temporarily downgrade the version to v0.2.6. We are currently investigating the problem and will provide a fix as soon as possible. Thank you for your understanding and continued support.": "我们为最新更新 (v0.2.7) 中出现的堆叠 bug 造成的不便深表歉意。该问题导致玩家在砍树等操作后卡住，我们已临时将版本降级至 v0.2.6。我们正在调查问题并将尽快提供修复。感谢您的理解与持续支持。",
    "The default build of the game has been updated to version": "游戏默认版本已更新至",
    "For detailed update information, please refer to our previous posts.": "详细更新信息请参阅我们之前的公告。",
    "The current build has been set as the default build.": "当前版本已设为首选版本。",
    "For details on the changes, please refer to previous news updates.": "变更详情请参阅之前的新闻更新。",
    "v0.3.4 has been set as the default version.": "v0.3.4 已设为首选版本。",

    # 分类标题
    "New H Scenes": "🆕 新增 H 场景",
    "New Features": "🆕 新增功能",
    "Additions": "🆕 新增内容",
    "Added H Content": "🆕 新增 H 内容",
    "Fixes & Adjustments": "🔧 修复与调整",
    "Fixes": "🔧 修复",
    "Fixes and Adjustments": "🔧 修复与调整",
    "General": "📌 通用",
    "Additions": "🆕 新增内容",

    # H 场景相关
    "Male × Hanged Blue-Haired Girl (Normal)": "男性 × 被吊起的蓝发女孩（普通）",
    "Male × Hanged Blue-Haired Girl (Forced)": "男性 × 被吊起的蓝发女孩（强制）",
    "Male × Hanged Pink-Haired Girl (Normal ×2)": "男性 × 被吊起的粉发女孩（普通 ×2）",
    "Yona × Large Young Man (Normal)": "约娜 × 高大青年（普通）",
    "Man × Reaper (Normal)": "男性 × 死神（普通）",
    "Yona × Son (Normal)": "约娜 × 儿子（普通）",
    "Maiden × Male (Forced)": "少女 × 男性（强制）",
    "Male × Prototype Type B (Normal)": "男性 × 原型 B 型（普通）",
    "Male × Prototype Type C (Normal)": "男性 × 原型 C 型（普通）",
    "Male × Android (Normal)": "男性 × 安卓机器人（普通）",
    "Yona × Man (Normal) × 3": "约娜 × 男性（普通）× 3",
    "Yona × Male Protagonist (Missionary) (Normal)": "约娜 × 男主角（传教士体位）（普通）",
    "Milking Machine (Large Female Native, Large Girl)": "挤奶机（大型女性原住民、大型女孩）",
    "Milking Machine (Maiden, Mummy, Underground Woman)": "挤奶机（少女、木乃伊、地下女性）",
    "Daruma (Large Girl)": "达摩（大型女孩）",
    "Daruma (Maiden)": "达摩（少女）",
    "Daruma (Young Lady)": "达摩（年轻女士）",
    "Gallows ( Maiden, Fat Young Man)": "绞刑架（少女、胖青年）",
    "Guillotine (Maiden, Fat Young Man)": "断头台（少女、胖青年）",
    "Hooks (Maiden, Fat Young Man)": "钩子（少女、胖青年）",
    "Punching Bag (Maiden, Fat Young Man)": "沙袋（少女、胖青年）",
    "Wooden Horse (Maiden, Fat Young Man)": "木马（少女、胖青年）",
    "Dismantling (Son)": "拆解（儿子）",
    "Dismantling (Young Lady)": "拆解（年轻女士）",
    "Dismantling (Young Man)": "拆解（青年男性）",
    "Male Protagonist x Santa (Standard H Scene)": "男主角 × 圣诞老人（标准 H 场景）",
    "Male Protagonist x Nami (normal H)": "男主角 × 奈米（普通 H）",
    "Male Protagonist x Nami (forced H)": "男主角 × 奈米（强制 H）",
    "Yona x Nami (normal H)": "约娜 × 奈米（普通 H）",

    # NPC 名称
    "Yona": "约娜",
    "Nami": "奈米",
    "Reika": "玲香",
    "Kana": "卡娜",
    "Lulu": "露露",
    "Takumi": "拓海",
    "Shino": "志乃",
    "Santa": "圣诞老人",
    "Reaper": "死神",
    "Ent King": "树精之王",
    "Entking": "树精之王",
    "Ent Queen": "树精女王",
    "Giant": "巨人",
    "Young Man": "青年男性",
    "Young Lady": "年轻女士",
    "Young Men": "青年男性",
    "Large Young Man": "高大青年",
    "Fat Young Man": "胖青年",
    "Boy": "男孩",
    "Large Boy": "大型男孩",
    "Large Girl": "大型女孩",
    "Large Female Native": "大型女性原住民",
    "Large Male Native": "大型男性原住民",
    "Female Native": "女性原住民",
    "Male Native": "男性原住民",
    "Native": "原住民",
    "Small Native": "小型原住民",
    "Elder Native Woman": "老年女性原住民",
    "Elder Native Man": "老年男性原住民",
    "Elder Sister Native": "原住民姐姐",
    "Native Boss Lady": "原住民女首领",
    "Tribal Boss": "部落首领",
    "Underground Woman": "地下女性",
    "Underground Young Man": "地下青年男性",
    "Maiden": "少女",
    "Mummy": "木乃伊",
    "Son": "儿子",
    "Chubby Guy": "胖墩",
    "Cave Ape": "洞穴猿",
    "Android": "安卓机器人",
    "Prototype": "原型",
    "Wisp": "精灵",
    "Male Protagonist": "男主角",
    "Male Player": "男性玩家",
    "Blue-Haired Girl": "蓝发女孩",
    "Pink-Haired Girl": "粉发女孩",
    "Female Native Girl": "女性原住民女孩",
    "NPC": "NPC",
    "NPCs": "NPC",

    # 物品/系统
    "Raider's Leather Outfit": "掠夺者皮革套装",
    "Outfit Coordination feature": "服装搭配功能",
    "Apparel feature": "服装系统",
    "Original NPC loading feature": "原创 NPC 加载功能",
    "Workshop upload and subscription feature for Original NPCs": "原创 NPC 的 Workshop 上传与订阅功能",
    "Dialogue Editing function": "对话编辑功能",
    "Visiting feature": "拜访功能",
    "Workshop NPC creation mode": "Workshop NPC 创建模式",
    "Pregnancy and childbirth system for Yona": "约娜怀孕与分娩系统",
    "Workshop upload feature for Visiting data": "拜访数据的 Workshop 上传功能",
    "Pregnancy for the large female native": "大型女性原住民怀孕",
    "Pregnancy for the underground woman": "地下女性怀孕",
    "Underground Mine": "地下矿井",
    "Logging Site": "伐木场",
    "Mining Site": "采矿场",
    "Breeding Facility": "繁殖设施",
    "Pregnancy Accelerator": "怀孕加速器",
    "Meal Distributor": "餐食分配器",
    "Simple Houses": "简易房屋",
    "Flesh Collector": "血肉收集器",
    "Restraint Chain": "束缚锁链",
    "Raid Horn": "突袭号角",
    "Black Curtain Arch": "黑色幕帘拱门",
    "Picture Frame": "相框",
    "Snow Dome": "雪球装饰",
    "Cursed Hand": "诅咒之手",
    "Reaper's Scythe": "死神之镰",
    "Cursed Jar": "诅咒罐子",
    "Chaos Vines": "混沌藤蔓",
    "Chaos Ring": "混沌戒指",
    "Toy Hammer": "玩具锤",
    "Kodachi": "小太刀",
    "Shuriken": "手里剑",
    "Pocket": "口袋",
    "Bottle (Flower)": "瓶子（花）",
    "Withered Tree": "枯树",
    "White Tiger Hood": "白虎兜帽",
    "White Tiger Ears": "白虎耳",
    "Triangle Hat": "三角帽",
    "Growth Potion": "成长药水",
    "Contraceptive": "避孕药",
    "Backpack Vacuum": "背包吸尘器",
    "Stairs": "楼梯",
    "Lights": "灯",
    "Raft": "木筏",
    "Cage Trap": "笼陷阱",
    "Kana's Stool": "卡娜的凳子",
    "Reindeer": "驯鹿",
    "Horse": "马匹",
    "Present Hunt": "礼物狩猎",
    "Santa Event": "圣诞老人事件",
    "Reaper Raid": "死神突袭",
    "Reaper Event": "死神事件",
    "Raid Mode": "突袭模式",
    "Survivor type": "幸存者类型",
    "Sex Scene Lock": "H 场景锁定",

    # 系统功能
    "Dialogue Editing": "对话编辑",
    "Dialogue Edit": "对话编辑",
    "Visiting": "拜访",
    "Workshop": "创意工坊",
    "Apparel": "服装",
    "Outfit": "服装搭配",
    "Dismantling": "拆解",
    "Restraint": "束缚",
    "Original NPC": "原创 NPC",
    "Android applications": "安卓机器人应用",
    "Android production": "安卓机器人制造",
    "Environment color": "环境光照",
    "Environment lighting": "环境光照",
    "Field BGM": "场景背景音乐",
    "Background music": "背景音乐",
    "Quality setting": "画质设置",
    "OS language settings": "操作系统语言设置",
    "DLC update button": "DLC 更新按钮",
    "Title screen": "标题画面",
    "Edit mode": "编辑模式",
    "Skin color": "皮肤颜色",
    "Nipple color": "乳头颜色",
    "Body color": "身体颜色",
    "Hairstyle": "发型",
    "Apparel equipment colors": "服装装备颜色",
    "Base equipment": "基础装备",
    "Ribbon equipment": "丝带装备",
    "Chest parts": "胸部部件",
    "Neck": "脖子",
    "Head": "头部",
    "Penis color": "阴茎颜色",
    "Laser": "激光",
    "Melee attack": "近战攻击",
    "Throw attack": "投掷攻击",
    "Heavy attack": "重攻击",
    "F attack": "F 攻击",
    "Contact damage": "接触伤害",
    "Hit detection": "命中检测",
    "Friendly fire": "友军伤害",
    "Enemy detection": "敌人检测",
    "Search range": "搜索范围",
    "Animation speed": "动画速度",
    "Dance animation": "舞蹈动画",
    "H animation": "H 动画",
    "H scenes": "H 场景",
    "H scene": "H 场景",
    "Sex": "性行为",
    "Pregnancy": "怀孕",
    "Pregnant": "怀孕的",
    "Belly": "腹部",
    "Breeding": "繁殖",
    "Father": "父亲",
    "Childbirth": "分娩",
    "Maturity value": "成熟度数值",
    "Affinity": "好感度",
    "Emotions": "情感",
    "Corpse": "尸体",
    "Grappled": "被擒拿",
    "Unconscious": "昏迷",
    "Knocked-out": "被击晕",
    "Downed": "倒下的",
    "Save file": "存档文件",
    "Save data": "存档数据",
    "Save": "存档",
    "Load": "加载",
    "Reload": "重新加载",
    "Stage": "场景",
    "Map": "地图",
    "House": "房屋",
    "House ID": "房屋 ID",
    "Chest": "箱子",
    "Inventory": "物品栏",
    "Backpack": "背包",
    "Bag slots": "背包槽位",
    "Storage": "存储",
    "Cloth storage": "布料存储",
    "Stack": "堆叠",
    "Food stack": "食物堆叠",
    "Material quantity": "材料数量",
    "Item quantity": "物品数量",
    "Equipment": "装备",
    "Weapon": "武器",
    "Costume": "服装",
    "Clothing": "衣物",
    "Glasses": "眼镜",
    "Tooltip": "工具提示",
    "UI": "界面",
    "Status page": "状态页面",
    "Building": "建筑",
    "Bridge construction event": "桥梁建设事件",
    "Event": "事件",
    "Quest": "任务",
    "Repeat quest": "重复任务",
    "Substory": "支线剧情",
    "Main Story": "主线故事",
    "Story text": "故事文本",
    "Line breaks": "换行",
    "Typos": "错别字",
    "Localization": "本地化",
    "Localization texts": "本地化文本",
    "Localization errors": "本地化错误",
    "Visual bugs": "视觉 bug",
    "Visual Bug": "视觉 bug",
    "Visual bugs": "视觉 bug",
    "Texture": "纹理",
    "Texture error": "纹理错误",
    "Thatched house": "茅草屋",
    "Floor": "地板",
    "Interiors": "室内",
    "Outdoor configuration": "室外配置",
    "Blinking effect": "闪烁效果",
    "Highlight": "高光",
    "Eyes": "眼睛",
    "Limbs": "四肢",
    "Hips": "臀部",
    "Back hair": "后发",
    "Hairstyle edits": "发型编辑",
    "Scale values": "缩放值",
    "Size type": "体型",
    "Large": "大型",
    "Medium": "中型",
    "Soft-lock": "软锁定",
    "Stuck": "卡住",
    "Freeze": "卡死",
    "Crash": "崩溃",
    "Error handling": "错误处理",
    "Fail-safe": "故障保护",
    "Character deletion log": "角色删除日志",
    "Game data": "游戏数据",
    "Performance": "性能",
    "Memory": "内存",
    "Unity": "Unity 引擎",
    "Security update": "安全更新",
    "Vulnerability fix": "漏洞修复",
    "Supporter": "支持者",
    "Patron": "赞助者",
    "Default version": "默认版本",
    "Default build": "默认版本",
    "Beta branch": "Beta 分支",
    "Beta version": "Beta 版本",
    "Debug branch": "Debug 分支",
    "Public branch": "公开分支",

    # 通用动词/形容词
    "Fixed": "修复了",
    "Added": "新增了",
    "Adjusted": "调整了",
    "Enabled": "启用了",
    "Removed": "移除了",
    "Changed": "更改了",
    "Corrected": "修正了",
    "Implemented": "实施了",
    "Applied": "应用了",
    "Displayed": "显示了",
    "Updated": "更新了",
    "Improved": "改进了",
    "Reduced": "减少了",
    "Increased": "增加了",
    "Replaced": "替换了",
    "several": "多个",
    "critical": "关键",
    "various": "各种",
    "properly": "正确",
    "correctly": "正确地",
    "incorrectly": "错误地",
    "automatically": "自动",
    "temporarily": "临时",
    "no longer": "不再",
    "can now": "现在可以",
    "could not": "无法",
    "did not": "未能",
    "was not": "未被",
    "were not": "未被",
    "has been": "已",
    "have been": "已",
    "is now": "现在",
    "can be": "可以被",
    "will be": "将被",
    "so that": "以便",
    "such as": "例如",
    "including": "包括",
    "etc": "等",
    "approximately": "约",
    "around": "约",
    "over": "超过",
}

def translate_text(text):
    """简单翻译：替换已知术语"""
    result = text
    # 按长度降序排列，优先匹配长词
    for en, zh in sorted(TRANSLATIONS.items(), key=lambda x: -len(x[0])):
        result = result.replace(en, zh)
    return result

def fetch_updates():
    """从 Steam API 获取更新数据"""
    req = urllib.request.Request(API_URL, headers={"User-Agent": "MadIslandTracker/1.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())
    return data["appnews"]["newsitems"]

def load_tracked():
    """加载已追踪的更新 ID 列表"""
    if os.path.exists(TRACK_FILE):
        with open(TRACK_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"tracked_gids": [], "last_check": None}

def save_tracked(tracked):
    """保存已追踪的更新 ID 列表"""
    with open(TRACK_FILE, "w", encoding="utf-8") as f:
        json.dump(tracked, f, ensure_ascii=False, indent=2)

def format_update(news_item):
    """格式化单条更新为 Markdown"""
    title = news_item["title"]
    date = datetime.fromtimestamp(news_item["date"], tz=timezone.utc)
    # 转换为北京时间
    bj_date = date + timedelta(hours=8)
    date_str = bj_date.strftime("%Y-%m-%d %H:%M")
    author = news_item.get("author", "")
    contents = news_item.get("contents", "")
    url = news_item.get("url", "")

    # 翻译标题
    zh_title = translate_text(title)
    # 翻译内容
    zh_contents = translate_text(contents)

    md = f"### {zh_title}\n\n"
    md += f"**日期**：{date_str}（北京时间）  \n"
    md += f"**原始标题**：{title}  \n"
    if author:
        md += f"**作者**：{author}  \n"
    md += f"**链接**：[Steam 公告]({url})  \n\n"
    md += f"{zh_contents}\n\n"
    md += "---\n\n"
    return md

def generate_full_history(updates):
    """生成完整的更新历史 Markdown 文件"""
    # 筛选 2024年12月至今的更新
    cutoff = datetime(2024, 12, 1, tzinfo=timezone.utc).timestamp()

    filtered = []
    for item in updates:
        if item["date"] >= cutoff:
            filtered.append(item)

    # 按日期排序（最新的在前）
    filtered.sort(key=lambda x: x["date"], reverse=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("# Mad Island（疯狂岛）更新日志\n\n")
        f.write(f"本文件自动从 Steam API 生成，覆盖 2024年12月至今的所有更新公告。\n\n")
        f.write(f"**生成时间**：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}（北京时间）  \n")
        f.write(f"**Steam App ID**：[{APP_ID}](https://store.steampowered.com/app/{APP_ID})  \n")
        f.write(f"**总计更新数**：{len(filtered)} 条\n\n")
        f.write("---\n\n")

        # 按年月分组
        groups = {}
        for item in filtered:
            d = datetime.fromtimestamp(item["date"], tz=timezone.utc) + timedelta(hours=8)
            ym = d.strftime("%Y 年 %m 月")
            if ym not in groups:
                groups[ym] = []
            groups[ym].append(item)

        for ym, items in groups.items():
            f.write(f"## {ym}（{len(items)} 条更新）\n\n")
            for item in items:
                f.write(format_update(item))

    print(f"已生成完整更新历史：{OUTPUT_FILE}")
    print(f"  - 共 {len(filtered)} 条更新")
    print(f"  - 覆盖 {len(groups)} 个月")

def check_new_updates(updates):
    """检查是否有新更新，如果有则追加到文件"""
    tracked = load_tracked()
    tracked_gids = set(tracked["tracked_gids"])

    new_items = [item for item in updates if item["gid"] not in tracked_gids]

    if not new_items:
        print(f"没有新更新。（共追踪 {len(tracked_gids)} 条）")
        return

    print(f"发现 {len(new_items)} 条新更新！")

    # 筛选 2024年12月之后的
    cutoff = datetime(2024, 12, 1, tzinfo=timezone.utc).timestamp()
    new_items = [item for item in new_items if item["date"] >= cutoff]
    new_items.sort(key=lambda x: x["date"])

    if not new_items:
        print("新更新不在追踪时间范围内。")
        return

    # 追加到文件
    with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
        f.write(f"\n## 新增更新（{datetime.now().strftime('%Y-%m-%d %H:%M')}）\n\n")
        for item in new_items:
            f.write(format_update(item))

    # 更新追踪记录
    for item in new_items:
        tracked["tracked_gids"].append(item["gid"])
    tracked["last_check"] = datetime.now().isoformat()
    save_tracked(tracked)

    print(f"已追加 {len(new_items)} 条新更新到 {OUTPUT_FILE}")

    # 打印新更新标题
    for item in new_items:
        title = item["title"]
        date = datetime.fromtimestamp(item["date"], tz=timezone.utc) + timedelta(hours=8)
        print(f"  - [{date.strftime('%m/%d')}] {translate_text(title)}")

def main():
    print("正在从 Steam API 获取 Mad Island 更新数据...")
    try:
        updates = fetch_updates()
        print(f"获取到 {len(updates)} 条公告")
    except Exception as e:
        print(f"获取失败：{e}")
        # 尝试使用本地缓存
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                updates = json.load(f)["appnews"]["newsitems"]
            print(f"使用本地缓存：{len(updates)} 条")
        else:
            sys.exit(1)

    # 保存原始数据
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump({"appnews": {"appid": APP_ID, "newsitems": updates}}, f, ensure_ascii=False)

    if "--full" in sys.argv or not os.path.exists(OUTPUT_FILE):
        print("生成完整更新历史...")
        generate_full_history(updates)
    else:
        check_new_updates(updates)

if __name__ == "__main__":
    main()

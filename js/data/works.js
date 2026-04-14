export const workDefs = {
  labor:{ name:'村莊打工', staminaCost:2, skill:'labor', base:10 },
  lumber:{ name:'伐木', staminaCost:3, skill:'lumber', base:10 },
  mining:{ name:'挖礦', staminaCost:5, skill:'mining', base:10 },
  fishing:{ name:'釣魚', staminaCost:2, skill:'fishing', base:10 },
  hunting:{ name:'狩獵', staminaCost:5, skill:'hunting', base:10 },
  forest:{ name:'森林採集', staminaCost:3, skill:'gathering', base:10 },
  shore:{ name:'海邊採集', staminaCost:3, skill:'gathering', base:10 },
  digging:{ name:'挖掘', staminaCost:4, skill:'digging', base:10 }
};

export const workerJobs = [
  'idle','labor','lumber','mining','fishing','hunting',
  'forest','shore','digging','farming','crafting','cook','ranch'
];

export const workLootInfo = {
  labor:['金幣：固定獲得','普通經驗：1','技能經驗：1'],
  lumber:['木頭：100%，2~5','樹枝：100%，1~3','樹葉：100%，1~4','蘋果：15%，1~2','蘋果種子：5%，1'],
  mining:['石頭：100%，2~6','銅礦：100%，1~3','煤炭：80%，1~3','鐵礦：55%，1~2','銀礦：Lv10後 12%，1~2','磁石：Lv10後 8%，1','水晶：Lv10後 3%，1','金礦：Lv20後 6%，1~2','寶石：Lv20後 2%，1'],
  fishing:['魚：55%，2~4','蝦：30%，2~4','螃蟹：12%，1~2','蝸牛：5%，1','銅礦：1%，1~5','煤炭：0.5%，1~3','鐵礦：0.3%，1','銀礦：0.2%，1','磁石：0.1%，1','水晶：0.1%，1'],
  hunting:['雞、兔子、、野豬、鹿、野狼、棕熊、黑熊','動物可再分解成肉、皮、骨頭與稀有材料'],
  forest:['樹枝：100%，1~3','樹葉：100%，1~4','纖維：100%，1~3','草藥：65%，1~3','蘑菇：55%，1~3','小麥種子：10%，1','稀有藥草：8%，1','蘑菇菌種：8%，1','人蔘：5%，1','棉花種子：5%，1','蘿蔔種子：5%，1'],
  shore:['沙子：100%，1~5','貝類：70%，1~3','螃蟹：35%，1~2','樹枝：25%，1~2','珊瑚：15%，1'],
  digging:['泥土：100%，2~6','石頭：100%，1~4','沙子：50%，0~3','煤炭：Lv20後 5%，1','銅礦：Lv20後 2.5%，1','鐵礦：Lv30後 1.5%，1','銀礦：Lv35後 1%，1','磁石：Lv35後 0.8%，1','水晶：Lv40後 0.5%，1','金礦：Lv40後 0.1%，1','寶石：Lv50後 0.01%，1']
};

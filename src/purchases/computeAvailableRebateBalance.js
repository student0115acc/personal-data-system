// 規格書 4.2 節「回饋金總覽面板」公式：
// 可用回饋金餘額 = Σ(回饋金狀態=已存入回饋池 的回饋金) － Σ(已標記為已使用的回饋金)
// 實作上等同：只加總「已存入回饋池 且 已使用≠true」的信用卡回饋金。
export function computeAvailableRebateBalance(purchases) {
  return purchases
    .filter((p) => p['回饋金狀態'] === '已存入回饋池' && p['已使用'] !== true && p['已使用'] !== 'TRUE')
    .reduce((sum, p) => sum + Number(p['信用卡回饋金'] || 0), 0);
}

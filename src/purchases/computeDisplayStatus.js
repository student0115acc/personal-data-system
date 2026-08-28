// 規格書 4.2 節「顯示狀態自動規則」：規則依序判斷，符合第一條就回傳，
// 不再往下比對。
export function computeDisplayStatus(purchase) {
  const 款項屬性 = purchase['款項屬性'];
  const 到貨狀態 = purchase['到貨狀態'];
  const 請款狀態 = purchase['請款狀態'];
  const 撥款狀態 = purchase['撥款狀態'];

  if (款項屬性 === '自用') {
    return { text: '自用', color: 'gray' };
  }
  if (款項屬性 === '回饋金已抵用') {
    return { text: '回饋金已抵用', color: 'blue' };
  }
  if (款項屬性 === '需請款撥款' && 到貨狀態 === '未到貨') {
    return { text: '待到貨', color: 'red' };
  }
  if (到貨狀態 === '已到貨' && 請款狀態 === '未請款') {
    return { text: '待請款', color: 'orange' };
  }
  if (請款狀態 === '已請款' && 撥款狀態 === '未撥款') {
    return { text: '待撥款', color: 'yellow' };
  }
  if (撥款狀態 === '已撥款') {
    return { text: '撥款完成', color: 'green' };
  }
}

/**
 * L-Step タグリストをスプレッドシートに書き込む
 * PPAL プロジェクト用
 */

function pushLStepTags() {
  // タグデータ（34件）
  const tags = [
    ["タグ名", "カテゴリ", "カラー", "説明", "優先度"],
    // セグメント（3件）
    ["Seg:Tech_Interest", "セグメント", "#3B82F6", "技術・コーディングに関心があるユーザー", "High"],
    ["Seg:Biz_Result", "セグメント", "#10B981", "時短・成果に関心があるユーザー", "High"],
    ["Seg:Other", "セグメント", "#6B7280", "その他セグメント", "Medium"],
    // ステータス（9件）
    ["Status:5Days_Registered", "ステータス", "#8B5CF6", "5Daysセミナー登録済み", "High"],
    ["Status:5Days_Completed", "ステータス", "#8B5CF6", "5Daysセミナー完走済み", "High"],
    ["Status:Warm_Lead", "ステータス", "#F59E0B", "購入見込み顧客", "Medium"],
    ["Status:Purchased_Main", "ステータス", "#22C55E", "PPALメンバーシップ購入済み", "High"],
    ["Status:Purchased_Archive", "ステータス", "#22C55E", "アーカイブ購入済み", "High"],
    ["Status:Purchased_VIP", "ステータス", "#EF4444", "VIPコーチング購入済み", "High"],
    ["Status:Churned", "ステータス", "#EF4444", "解約済み", "High"],
    ["Status:Graduate", "ステータス", "#F59E0B", "全講座完了（卒業）", "High"],
    // 商品（3件）
    ["Product:PPAL_Monthly", "商品", "#3B82F6", "PPAL月額メンバーシップ", "Medium"],
    ["Product:Archive", "商品", "#3B82F6", "Agent Master Archive", "Medium"],
    ["Product:VIP_Coaching", "商品", "#EF4444", "VIPコーチング", "Medium"],
    // 進捗（8件）
    ["Progress:Week1_Started", "進捗", "#60A5FA", "Week1開始", "High"],
    ["Progress:Week1_Complete", "進捗", "#22C55E", "Week1完了", "High"],
    ["Progress:Week2_Started", "進捗", "#60A5FA", "Week2開始", "Medium"],
    ["Progress:Week2_Complete", "進捗", "#22C55E", "Week2完了", "Medium"],
    ["Progress:Week3_Started", "進捗", "#60A5FA", "Week3開始", "Medium"],
    ["Progress:Week3_Complete", "進捗", "#22C55E", "Week3完了", "Medium"],
    ["Progress:Week4_Started", "進捗", "#60A5FA", "Week4開始", "Medium"],
    ["Progress:All_Complete", "進捗", "#F59E0B", "全講座完了", "High"],
    // エンゲージメント（4件）
    ["Eng:High_Activity", "エンゲージメント", "#22C55E", "高アクティビティユーザー", "Medium"],
    ["Eng:Low_Activity", "エンゲージメント", "#EF4444", "低アクティビティユーザー", "Medium"],
    ["Engagement:Active", "エンゲージメント", "#22C55E", "アクティブユーザー", "Medium"],
    ["Engagement:Review_Posted", "エンゲージメント", "#F59E0B", "レビュー投稿済み", "Low"],
    // その他（7件）
    ["Upsell:VIP_Candidate", "アップセル", "#8B5CF6", "VIPアップセル候補", "Medium"],
    ["Source:5Days", "流入元", "#6B7280", "5Daysセミナー経由", "Low"],
    ["Source:Note", "流入元", "#6B7280", "Note経由", "Low"],
    ["Source:Organic", "流入元", "#6B7280", "オーガニック検索経由", "Low"],
    ["Support:Requested", "サポート", "#F59E0B", "サポートリクエスト中", "Medium"],
    ["Community:Joined", "コミュニティ", "#10B981", "コミュニティ参加済み", "Low"],
    ["Live:Registered", "ライブ", "#3B82F6", "ライブセッション登録済み", "Low"],
    ["Test:Sandbox", "テスト", "#9CA3AF", "テスト用タグ", "Low"]
  ];

  // 新しいスプレッドシートを作成
  const spreadsheet = SpreadsheetApp.create("PPAL L-Step タグリスト");
  const sheet = spreadsheet.getActiveSheet();
  sheet.setName("タグ一覧");

  // データを書き込み
  const range = sheet.getRange(1, 1, tags.length, tags[0].length);
  range.setValues(tags);

  // ヘッダー行のスタイル設定
  const headerRange = sheet.getRange(1, 1, 1, tags[0].length);
  headerRange.setBackground("#1F2937");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");

  // 列幅を自動調整
  sheet.autoResizeColumns(1, tags[0].length);

  // カラー列にセルの背景色を適用
  for (let i = 1; i < tags.length; i++) {
    const colorCell = sheet.getRange(i + 1, 3); // C列
    const colorValue = tags[i][2];
    if (colorValue && colorValue.startsWith("#")) {
      colorCell.setBackground(colorValue);
      // 暗い色の場合はテキストを白に
      const brightness = parseInt(colorValue.slice(1), 16);
      if (brightness < 0x888888) {
        colorCell.setFontColor("#FFFFFF");
      }
    }
  }

  // カテゴリごとに交互の背景色
  const categories = {};
  let colorToggle = false;
  for (let i = 1; i < tags.length; i++) {
    const category = tags[i][1];
    if (!categories[category]) {
      categories[category] = colorToggle;
      colorToggle = !colorToggle;
    }
    if (categories[category]) {
      sheet.getRange(i + 1, 1, 1, tags[0].length).setBackground("#F3F4F6");
    }
  }

  // フィルター設定
  sheet.getRange(1, 1, tags.length, tags[0].length).createFilter();

  // 枠線追加
  range.setBorder(true, true, true, true, true, true);

  const url = spreadsheet.getUrl();
  console.log("スプレッドシート作成完了: " + url);

  return url;
}

// テスト用
function testPushLStepTags() {
  const url = pushLStepTags();
  SpreadsheetApp.getUi().alert("作成完了!\n\n" + url);
}

// src/lib/alertTranslations.ts

export interface AlertDictionary {
  title: string;
  subtitle: string;
  shield_active: string;
  shield_all_clear: string;
  shield_hazards_found: string;
  monitoring_city: string;
  test_btn: string;
  settings_btn: string;
  sound_on: string;
  sound_muted: string;
  notify_permission_cta: string;
  notify_enabled: string;
  notify_blocked: string;
  test_toast_title: string;
  test_toast_desc: string;
  hazard_thunderstorm_title: string;
  hazard_thunderstorm_desc: string;
  hazard_thunderstorm_advice: string;
  hazard_wind_title: string;
  hazard_wind_desc: string;
  hazard_wind_advice: string;
  hazard_heat_title: string;
  hazard_heat_desc: string;
  hazard_heat_advice: string;
  hazard_cold_title: string;
  hazard_cold_desc: string;
  hazard_cold_advice: string;
  hazard_rain_title: string;
  hazard_rain_desc: string;
  hazard_rain_advice: string;
  hazard_air_title: string;
  hazard_air_desc: string;
  hazard_air_advice: string;
  hazard_official_title: string;
  hazard_official_desc: string;
  hazard_official_advice: string;
  settings_title: string;
  settings_sound_label: string;
  settings_sound_sub: string;
  settings_push_label: string;
  settings_push_sub: string;
  settings_types_title: string;
  settings_storm_label: string;
  settings_wind_label: string;
  settings_heat_label: string;
  settings_cold_label: string;
  settings_rain_label: string;
  settings_air_label: string;
  close: string;
}

export const WATCHER_EN: AlertDictionary = {
  title: "Severe Weather Watcher",
  subtitle: "24/7 automated monitoring for storms, gale winds, heatwaves, and air quality",
  shield_active: "Shield Active",
  shield_all_clear: "All Clear — Conditions are Safe",
  shield_hazards_found: "Immediate Weather Hazard Detected",
  monitoring_city: "Monitoring City",
  test_btn: "Test Alert",
  settings_btn: "Alert Settings",
  sound_on: "Sound On",
  sound_muted: "Muted",
  notify_permission_cta: "Enable Notifications",
  notify_enabled: "Notifications Active",
  notify_blocked: "Notifications Blocked",
  test_toast_title: "Severe Weather Watcher Active",
  test_toast_desc: "This is a test notification with synthesized alert chime. Stay safe!",
  hazard_thunderstorm_title: "Severe Thunderstorm & Lightning",
  hazard_thunderstorm_desc: "Violent lightning, squalls, or hail detected in the vicinity.",
  hazard_thunderstorm_advice: "Seek shelter indoors immediately, unplug delicate electronics, and stay away from windows.",
  hazard_wind_title: "High Wind & Gale Warning",
  hazard_wind_desc: "Dangerous gusts exceed safe limits.",
  hazard_wind_advice: "Secure loose outdoor patio items, watch for fallen branches, and avoid high-profile vehicles.",
  hazard_heat_title: "Extreme Heat Index Warning",
  hazard_heat_desc: "Dangerously high temperatures. Severe heat exhaustion or heatstroke risk.",
  hazard_heat_advice: "Stay hydrated with electrolytes, remain in air-conditioned spaces, and avoid strenuous outdoor exercise.",
  hazard_cold_title: "Freezing Cold & Frost Advisory",
  hazard_cold_desc: "Sub-zero temperatures with danger of frostbite and icy black ice roads.",
  hazard_cold_advice: "Dress in warm insulated layers, protect exposed plumbing, and drive with extreme caution.",
  hazard_rain_title: "Heavy Torrential Rain & Flash Flood Risk",
  hazard_rain_desc: "Intense downpours may overwhelm local drainage systems.",
  hazard_rain_advice: "Avoid flooded underpasses, stay clear of fast-moving canals, and move valuables to higher ground.",
  hazard_air_title: "Hazardous Air Quality & PM2.5 Alert",
  hazard_air_desc: "Particulate pollution levels are hazardous to human health.",
  hazard_air_advice: "Wear an N95 respirator mask outdoors, keep windows tightly closed, and run an HEPA air purifier.",
  hazard_official_title: "Official Meteorological Advisory",
  hazard_official_desc: "Emergency weather bulletin issued by regional meteorological authorities.",
  hazard_official_advice: "Follow civil defense recommendations and monitor local broadcasts for evacuation routes.",
  settings_title: "Alert Watcher Preferences",
  settings_sound_label: "Play Synthesized Alert Chime",
  settings_sound_sub: "Emits a dual-tone chime when severe conditions exceed threshold",
  settings_push_label: "Push Notifications",
  settings_push_sub: "Deliver notifications even when My Weather Pal is in the background",
  settings_types_title: "Monitored Hazard Types",
  settings_storm_label: "Thunderstorms & Lightning",
  settings_wind_label: "Gale Winds (> 45 km/h)",
  settings_heat_label: "Extreme Heatwaves (> 38°C)",
  settings_cold_label: "Freezing Cold (≤ 0°C)",
  settings_rain_label: "Torrential Rain & Floods",
  settings_air_label: "Hazardous PM2.5 (AQI > 150)",
  close: "Done",
};

export const WATCHER_I18N: Record<string, Partial<AlertDictionary>> = {
  th: {
    title: "ระบบเฝ้าระวังภัยสภาพอากาศ",
    subtitle: "ตรวจจับพายุ ลมกระโชกแรง คลื่นความร้อน และมลพิษทางอากาศอัตโนมัติ 24 ชม.",
    shield_active: "ระบบพร้อมปกป้อง",
    shield_all_clear: "สภาวะปลอดภัย — ไม่มีสัญญาณอันตราย",
    shield_hazards_found: "ตรวจพบความเสี่ยงสภาพอากาศรุนแรง",
    monitoring_city: "กำลังเฝ้าระวังเมือง",
    test_btn: "ทดสอบการเตือน",
    settings_btn: "ตั้งค่าการแจ้งเตือน",
    sound_on: "เปิดเสียง",
    sound_muted: "ปิดเสียง",
    notify_permission_cta: "เปิดการแจ้งเตือน",
    notify_enabled: "เปิดการแจ้งเตือนแล้ว",
    notify_blocked: "การแจ้งเตือนถูกปิดกั้น",
    test_toast_title: "ระบบเตือนภัยทำงานปกติ",
    test_toast_desc: "นี่คือการทดสอบเสียงสัญญาณเตือนภัย ขอให้คุณปลอดภัยทุกการเดินทาง!",
    hazard_thunderstorm_title: "พายุฝนฟ้าคะนองและฟ้าผ่ารุนแรง",
    hazard_thunderstorm_desc: "ตรวจพบฟ้าผ่า ลมกระโชกแรง หรือลูกเห็บตกในพื้นที่",
    hazard_thunderstorm_advice: "โปรดหลบในอาคารที่มั่นคงทันที ถอดปลั๊กอุปกรณ์ไฟฟ้า และอยู่ห่างจากหน้าต่าง",
    hazard_wind_title: "ลมกระโชกแรงและลมพายุ",
    hazard_wind_desc: "ความเร็วลมกระโชกเกินค่าความปลอดภัย เสี่ยงกิ่งไม้หักโค่น",
    hazard_wind_advice: "เก็บสิ่งของนอกอาคาร ระวังป้ายโฆษณา และหลีกเลี่ยงการขับรถในที่โล่งแจ้ง",
    hazard_heat_title: "ดัชนีความร้อนสูงระดับอันตราย",
    hazard_heat_desc: "อุณหภูมิร้อนจัด เสี่ยงต่อโรคลมแดด (ฮีทสโตรก) และการขาดน้ำ",
    hazard_heat_advice: "จิบลดน้ำและเกลือแร่บ่อยๆ อยู่ในที่ร่มมีพัดลมหรือเครื่องปรับอากาศ หลีกเลี่ยงกิจกรรมกลางแจ้ง",
    hazard_cold_title: "อากาศหนาวจัดและน้ำค้างแข็ง",
    hazard_cold_desc: "อุณหภูมิต่ำใกล้จุดเยือกแข็ง เสี่ยงต่อภาวะตัวเย็นเกินและถนนลื่น",
    hazard_cold_advice: "สวมเสื้อผ้ากันหนาวหนาหลายชั้น รักษาร่างกายให้อบอุ่น และระวังการเดินทางบนภูเขาสูง",
    hazard_rain_title: "ฝนตกหนักมากและเสี่ยงน้ำท่วมฉับพลัน",
    hazard_rain_desc: "ปริมาณน้ำฝนสะสมสูง อาจเกิดน้ำท่วมขังและน้ำป่าไหลหลาก",
    hazard_rain_advice: "หลีกเลี่ยงเส้นทางน้ำท่วมขัง ไม่ควรขับรถลุยน้ำลึก และยกสิ่งของขึ้นที่สูง",
    hazard_air_title: "มลพิษทางอากาศและฝุ่น PM2.5 วิกฤต",
    hazard_air_desc: "ค่าฝุ่นละอองขนาดเล็กเกินเกณฑ์มาตรฐาน มีผลกระทบต่อสุขภาพรุนแรง",
    hazard_air_advice: "สวมหน้ากาก N95 ตลอดเวลาเมื่ออยู่นอกอาคาร ปิดประตูหน้าต่างให้สนิท และเปิดเครื่องฟอกอากาศ",
    hazard_official_title: "ประกาศเตือนภัยจากกรมอุตุนิยมวิทยา",
    hazard_official_desc: "ประกาศแจ้งเตือนภัยสภาพอากาศอย่างเป็นทางการจากหน่วยงานรัฐ",
    hazard_official_advice: "ปฏิบัติตามคำแนะนำของเจ้าหน้าที่ และติดตามข่าวสารพยากรณ์อากาศอย่างใกล้ชิด",
    settings_title: "ตั้งค่าระบบเฝ้าระวังภัย",
    settings_sound_label: "เปิดเสียงเตือนภัยสังเคราะห์",
    settings_sound_sub: "ส่งเสียงเตือนสั้นๆ เมื่อตรวจพบสภาพอากาศรุนแรงเกินเกณฑ์",
    settings_push_label: "การแจ้งเตือนบนเบราว์เซอร์ / หน้าจอ",
    settings_push_sub: "รับการแจ้งเตือนได้ทันทีแม้ไม่ได้เปิดหน้าแอปทิ้งไว้",
    settings_types_title: "ประเภทภัยธรรมชาติที่เฝ้าระวัง",
    settings_storm_label: "พายุฝนฟ้าคะนองและฟ้าผ่า",
    settings_wind_label: "ลมกระโชกแรง (> 45 กม./ชม.)",
    settings_heat_label: "คลื่นความร้อนสูงจัด (> 38°C)",
    settings_cold_label: "อากาศหนาวจัด (≤ 0°C)",
    settings_rain_label: "ฝนตกหนักมากและน้ำท่วมฉับพลัน",
    settings_air_label: "ฝุ่น PM2.5 วิกฤต (AQI > 150)",
    close: "เสร็จสิ้น",
  },
  es: {
    title: "Vigilante de Clima Severo",
    subtitle: "Monitoreo 24/7 de tormentas, vendavales, olas de calor y calidad del aire",
    shield_active: "Escudo Activo",
    shield_all_clear: "Todo Despejado — Condiciones Seguras",
    shield_hazards_found: "Peligro Meteorológico Inmediato",
    monitoring_city: "Ciudad Monitoreada",
    test_btn: "Probar Alerta",
    settings_btn: "Ajustes",
    sound_on: "Sonido Activado",
    sound_muted: "Silenciado",
    notify_permission_cta: "Activar Notificaciones",
    notify_enabled: "Notificaciones Activas",
    notify_blocked: "Notificaciones Bloqueadas",
    test_toast_title: "Vigilante Meteorológico Activo",
    test_toast_desc: "Notificación de prueba con timbre de advertencia. ¡Manténgase seguro!",
    hazard_thunderstorm_title: "Tormenta Severa y Rayos",
    hazard_thunderstorm_desc: "Rayos violentos, ráfagas de viento o granizo detectados.",
    hazard_thunderstorm_advice: "Busque refugio interior de inmediato y manténgase alejado de las ventanas.",
    hazard_wind_title: "Aviso de Vientos Fuertes",
    hazard_wind_desc: "Ráfagas peligrosas que superan los límites de seguridad.",
    hazard_wind_advice: "Asegure muebles exteriores y tenga cuidado con la caída de ramas de árboles.",
    hazard_heat_title: "Alerta de Ola de Calor Extremo",
    hazard_heat_desc: "Temperaturas peligrosas con alto riesgo de insolación y deshidratación.",
    hazard_heat_advice: "Beba abundante agua fresca, permanezca en sitios frescos y no haga ejercicio al mediodía.",
    hazard_cold_title: "Aviso de Helada y Frío Extremo",
    hazard_cold_desc: "Temperaturas bajo cero con riesgo de placas de hielo en carreteras.",
    hazard_cold_advice: "Vístase con varias capas de ropa térmica y conduzca con extrema precaución.",
    hazard_rain_title: "Riesgo de Lluvias Torrenciales e Inundaciones",
    hazard_rain_desc: "Fuertes aguaceros pueden anegar pasos subterráneos y calles.",
    hazard_rain_advice: "No cruce zonas anegadas ni corrientes de agua rápidas.",
    hazard_air_title: "Alerta de Calidad del Aire y PM2.5",
    hazard_air_desc: "Nivel de partículas finas dañino para la salud respiratoria.",
    hazard_air_advice: "Use mascarilla N95 en exteriores y mantenga las ventanas cerradas.",
    hazard_official_title: "Boletín Meteorológico Oficial",
    hazard_official_desc: "Aviso de emergencia emitido por las autoridades regionales del clima.",
    hazard_official_advice: "Siga las instrucciones de protección civil.",
    close: "Listo",
  },
  fr: {
    title: "Surveillance Météo Sévère",
    subtitle: "Surveillance 24/7 des orages, tempêtes, canicules et pollution de l'air",
    shield_active: "Protection Active",
    shield_all_clear: "Tout est Calme — Conditions Sûres",
    shield_hazards_found: "Danger Météorologique Immédiat",
    monitoring_city: "Ville Surveillée",
    test_btn: "Tester l'Alerte",
    settings_btn: "Paramètres",
    sound_on: "Son Activé",
    sound_muted: "Muet",
    notify_permission_cta: "Activer les Notifications",
    notify_enabled: "Notifications Actives",
    notify_blocked: "Notifications Bloquées",
    test_toast_title: "Surveillance Météo Active",
    test_toast_desc: "Ceci est un test sonore avec carillon de sécurité.",
    hazard_thunderstorm_title: "Orages Violents & Foudre",
    hazard_thunderstorm_desc: "Foudre intense, rafales de vent ou grêle dans votre secteur.",
    hazard_thunderstorm_advice: "Mettez-vous immédiatement à l'abri à l'intérieur et débranchez les appareils fragiles.",
    hazard_wind_title: "Alerte Vents Violents & Coup de Vent",
    hazard_wind_desc: "Rafales dangereuses dépassant les limites sécuritaires.",
    hazard_wind_advice: "Fixez les objets extérieurs et méfiez-vous des chutes de branches.",
    hazard_heat_title: "Alerte Canicule Extrême",
    hazard_heat_desc: "Chaleur intense avec risque élevé de déshydratation et de coup de chaleur.",
    hazard_heat_advice: "Hydratez-vous régulièrement et évitez les efforts physiques en plein soleil.",
    hazard_cold_title: "Alerte Grand Froid & Gel",
    hazard_cold_desc: "Températures négatives avec risque de verglas sur les axes routiers.",
    hazard_cold_advice: "Portez des vêtements chauds isolants et redoublez de prudence au volant.",
    hazard_rain_title: "Pluie Torrentielle & Risque d'Inondation",
    hazard_rain_desc: "Fortes précipitations risquant de saturer rapidement les réseaux d'évacuation.",
    hazard_rain_advice: "Ne vous engagez pas sur les chaussées inondées.",
    hazard_air_title: "Alerte Pollution de l'Air & PM2.5",
    hazard_air_desc: "Concentration de particules fines nocive pour la santé.",
    hazard_air_advice: "Portez un masque N95 à l'extérieur et fermez vos fenêtres.",
    hazard_official_title: "Bulletin Météorologique Officiel",
    hazard_official_desc: "Avis d'urgence officiel émis par les services météorologiques régionaux.",
    hazard_official_advice: "Respectez les consignes de sécurité des autorités.",
    close: "Terminé",
  },
  de: {
    title: "Unwetter-Wächter",
    subtitle: "24/7-Überwachung für Gewitter, Sturm, Hitzewellen und Luftqualität",
    shield_active: "Schutz Aktiv",
    shield_all_clear: "Entwarnung — Sichere Wetterlage",
    shield_hazards_found: "Akute Wettergefahr Erkannt",
    monitoring_city: "Überwachte Stadt",
    test_btn: "Alarm Testen",
    settings_btn: "Einstellungen",
    sound_on: "Ton An",
    sound_muted: "Stumm",
    notify_permission_cta: "Benachrichtigungen Aktivieren",
    notify_enabled: "Benachrichtigungen Aktiv",
    notify_blocked: "Benachrichtigungen Blockiert",
    test_toast_title: "Unwetter-Wächter Aktiv",
    test_toast_desc: "Testwarnung mit Warnton. Bleiben Sie sicher!",
    hazard_thunderstorm_title: "Schweres Gewitter & Blitzschlag",
    hazard_thunderstorm_desc: "Starke Blitze, Sturmböen oder Hagel in der Region.",
    hazard_thunderstorm_advice: "Suchen Sie sofort Schutz im Gebäude und meiden Sie Fenster.",
    hazard_wind_title: "Sturm- und Orkanwarnung",
    hazard_wind_desc: "Gefährliche Windböen überschreiten sichere Grenzwerte.",
    hazard_wind_advice: "Sichern Sie Gegenstände im Freien und meiden Sie Wälder.",
    hazard_heat_title: "Extreme Hitzewarnung",
    hazard_heat_desc: "Gefährlich hohe Temperaturen. Gefahr von Hitzschlag.",
    hazard_heat_advice: "Viel Wasser trinken und kühle Innenräume aufsuchen.",
    hazard_cold_title: "Frost- und Kältewarnung",
    hazard_cold_desc: "Temperaturen unter Null mit Glatteisgefahr.",
    hazard_cold_advice: "Warm anziehen und vorsichtig fahren.",
    hazard_rain_title: "Starkregen & Überflutungsgefahr",
    hazard_rain_desc: "Heftige Regenfälle können Straßen überfluten.",
    hazard_rain_advice: "Unterführungen meiden und Gegenstände hochstellen.",
    hazard_air_title: "Feinstaub- & PM2.5-Alarm",
    hazard_air_desc: "Feinstaubwerte sind gesundheitsgefährdend.",
    hazard_air_advice: "Draußen N95-Maske tragen und Fenster geschlossen halten.",
    hazard_official_title: "Amtliche Wetterwarnung",
    hazard_official_desc: "Offizielle Unwetterwarnung des Wetterdienstes.",
    hazard_official_advice: "Beachten Sie die behördlichen Sicherheitshinweise.",
    close: "Fertig",
  },
  ja: {
    title: "気象災害ガード",
    subtitle: "雷雨、暴風、猛暑、大気汚染を24時間自動監視",
    shield_active: "シールド作動中",
    shield_all_clear: "安全確認 — 危険な気象シグナルはありません",
    shield_hazards_found: "危険な気象リスクを検知しました",
    monitoring_city: "監視対象都市",
    test_btn: "警報テスト",
    settings_btn: "警報設定",
    sound_on: "音声オン",
    sound_muted: "消音",
    notify_permission_cta: "プッシュ通知を許可",
    notify_enabled: "通知有効",
    notify_blocked: "通知がブロックされています",
    test_toast_title: "気象ガードが正常稼働中",
    test_toast_desc: "チャイム音を含むテスト通知です。安全にお過ごしください！",
    hazard_thunderstorm_title: "激しい雷雨・落雷・突風警報",
    hazard_thunderstorm_desc: "落雷、突風、または降雹が検知されました。",
    hazard_thunderstorm_advice: "速やかに堅牢な建物内に避難し、窓から離れてください。",
    hazard_wind_title: "強風・暴風警報",
    hazard_wind_desc: "瞬間最大風速が警戒基準を超えています。",
    hazard_wind_advice: "ベランダの飛散物を片付け、倒木や看板の落下に注意してください。",
    hazard_heat_title: "熱中症警戒アラート・極端な猛暑",
    hazard_heat_desc: "熱中症や脱水症状のリスクが極めて高くなっています。",
    hazard_heat_advice: "こまめに水分・塩分を補給し、冷房の効いた室内で過ごしてください。",
    hazard_cold_title: "低温注意報・凍結警報",
    hazard_cold_desc: "氷点下の冷え込みで路面凍結の恐れがあります。",
    hazard_cold_advice: "厚手の防寒具を着用し、凍結した路面での転倒やスリップに注意してください。",
    hazard_rain_title: "豪雨・短時間大雨・浸水警戒",
    hazard_rain_desc: "局地的な大雨により冠水や河川増水の危険があります。",
    hazard_rain_advice: "アンダーパスや増水した用水路には絶対に近づかないでください。",
    hazard_air_title: "深刻な大気汚染・PM2.5警報",
    hazard_air_desc: "微小粒子状物質が健康に影響を及ぼす水準です。",
    hazard_air_advice: "外出時はN95防塵マスクを着用し、窓を閉めて空気清浄機をご使用ください。",
    hazard_official_title: "気象庁・公式気象特別警報",
    hazard_official_desc: "公的気象機関より発表された公式警報です。",
    hazard_official_advice: "自治体の避難指示や防災無線のアナウンスに従ってください。",
    close: "完了",
  },
  zh: {
    title: "极端天气监视器",
    subtitle: "全天候监测雷暴、大风、极端高温和重度空气污染",
    shield_active: "防护盾已开启",
    shield_all_clear: "一切正常 — 天气状况安全",
    shield_hazards_found: "检测到突发气象风险",
    monitoring_city: "监测城市",
    test_btn: "测试提示音",
    settings_btn: "预警设置",
    sound_on: "开启声音",
    sound_muted: "静音",
    notify_permission_cta: "开启弹窗通知",
    notify_enabled: "通知已启用",
    notify_blocked: "通知已被阻止",
    test_toast_title: "天气守护者正在正常运行",
    test_toast_desc: "这是一条包含合成提示音的测试预警，祝您出行平安！",
    hazard_thunderstorm_title: "强对流雷暴与雷电预警",
    hazard_thunderstorm_desc: "监测到剧烈雷电、短时雷暴大风或冰雹。",
    hazard_thunderstorm_advice: "请立即进入坚固建筑物内避险，拔掉精密电器插头并远离窗户。",
    hazard_wind_title: "大风与强阵风预警",
    hazard_wind_desc: "瞬间阵风速度超过安全警戒值。",
    hazard_wind_advice: "请固定室外物品，谨防高空坠物，避免在大树下停留。",
    hazard_heat_title: "极端酷热高温预警",
    hazard_heat_desc: "极易发生中暑或严重脱水危险。",
    hazard_heat_advice: "及时补充电解质水分，尽量处于清凉环境中。",
    hazard_cold_title: "极寒与冰冻低温警报",
    hazard_cold_desc: "气温降至冰点以下，有路面结冰风险。",
    hazard_cold_advice: "请穿着多层防寒保暖衣物，行车走路谨防地面积冰。",
    hazard_rain_title: "暴雨与短时内涝积水预警",
    hazard_rain_desc: "短时强降水可能导致城市道路急剧积水。",
    hazard_rain_advice: "请勿涉水穿越积水低洼区，避免进入地下车库。",
    hazard_air_title: "重度空气污染与PM2.5预警",
    hazard_air_desc: "细颗粒物浓度已达到对健康有害的高风险水平。",
    hazard_air_advice: "外出务必佩戴N95口罩，紧闭门窗并开启空气净化器。",
    hazard_official_title: "气象部门官方灾害公告",
    hazard_official_desc: "气象或防灾部门发布的实时官方预警通报。",
    hazard_official_advice: "请遵从当地应急减灾指示，保持通讯畅通。",
    close: "完成",
  },
  pt: {
    title: "Vigilante de Clima Severo",
    subtitle: "Monitoramento 24/7 de tempestades, ventos fortes, ondas de calor e ar",
    shield_active: "Escudo Ativo",
    shield_all_clear: "Tudo Seguro — Condições Estáveis",
    shield_hazards_found: "Alerta de Risco Climático Detectado",
    monitoring_city: "Cidade Monitorada",
    test_btn: "Testar Alerta",
    settings_btn: "Configurações",
    sound_on: "Som Ligado",
    sound_muted: "Mudo",
    notify_permission_cta: "Ativar Notificações",
    notify_enabled: "Notificações Ativas",
    notify_blocked: "Notificações Bloqueadas",
    test_toast_title: "Vigilante de Clima Ativo",
    test_toast_desc: "Notificação de teste com sinal sonoro. Mantenha-se seguro!",
    hazard_thunderstorm_title: "Tempestade Severa e Raios",
    hazard_thunderstorm_desc: "Raios intensos, rajadas de vento ou granizo na área.",
    hazard_thunderstorm_advice: "Procure abrigo seguro imediatamente e fique longe de janelas.",
    hazard_wind_title: "Alerta de Vendaval e Ventos Fortes",
    hazard_wind_desc: "Rajadas perigosas que ultrapassam limites de segurança.",
    hazard_wind_advice: "Prenda objetos soltos e cuidado com galhos de árvores.",
    hazard_heat_title: "Alerta de Calor Extremo",
    hazard_heat_desc: "Temperaturas perigosas com alto risco de desidratação e insolação.",
    hazard_heat_advice: "Beba bastante água fresca e permaneça em locais arejados.",
    hazard_cold_title: "Alerta de Frio Intenso e Geada",
    hazard_cold_desc: "Temperaturas negativas com risco de gelo nas pistas.",
    hazard_cold_advice: "Vista roupas térmicas adequadas e dirija com cautela redobrada.",
    hazard_rain_title: "Chuva Torrencial e Risco de Enxurradas",
    hazard_rain_desc: "Fortes pancadas podem alagar ruas e vias baixas rapidamente.",
    hazard_rain_advice: "Evite cruzar trechos alagados e cursos de água volumosos.",
    hazard_air_title: "Alerta de Poluição do Ar e PM2.5",
    hazard_air_desc: "Níveis de partículas prejudiciais à saúde respiratória.",
    hazard_air_advice: "Use máscara N95 ao ar livre e mantenha janelas fechadas.",
    hazard_official_title: "Aviso Meteorológico Oficial",
    hazard_official_desc: "Boletim de emergência emitido por autoridades meteorológicas.",
    hazard_official_advice: "Siga as orientações da Defesa Civil local.",
    close: "Concluir",
  },
  ru: {
    title: "Монитор Опасной Погоды",
    subtitle: "Круглосуточный мониторинг гроз, штормов, жары и качества воздуха",
    shield_active: "Защита Активна",
    shield_all_clear: "Всё спокойно — Опасностей нет",
    shield_hazards_found: "Обнаружена Опасная Погода",
    monitoring_city: "Город",
    test_btn: "Тест",
    settings_btn: "Настройки",
    sound_on: "Звук Вкл",
    sound_muted: "Без звука",
    notify_permission_cta: "Включить Уведомления",
    notify_enabled: "Уведомления Включены",
    notify_blocked: "Уведомления Заблокированы",
    test_toast_title: "Монитор Погоды Активен",
    test_toast_desc: "Тестовый сигнал тревоги. Берегите себя!",
    hazard_thunderstorm_title: "Сильная Гроза и Молнии",
    hazard_thunderstorm_desc: "Грозовые разряды, шквалы или град в вашем районе.",
    hazard_thunderstorm_advice: "Немедленно зайдите в помещение и отойдите от окон.",
    hazard_wind_title: "Штормовой Ветер",
    hazard_wind_desc: "Опасные порывы ветра превышают безопасные нормы.",
    hazard_wind_advice: "Закрепите предметы на балконе и опасайтесь падения веток.",
    hazard_heat_title: "Аномальная Жара",
    hazard_heat_desc: "Опасная температура. Высокий риск теплового удара.",
    hazard_heat_advice: "Пейте воду и оставайтесь в кондиционируемых помещениях.",
    hazard_cold_title: "Сильный Мороз и Гололед",
    hazard_cold_desc: "Минусовая температура, опасность гололедицы на дорогах.",
    hazard_cold_advice: "Одевайтесь тепло и будьте осторожны за рулем.",
    hazard_rain_title: "Ливень и Угроза Подтоплений",
    hazard_rain_desc: "Интенсивные осадки могут вызвать затопление дорог.",
    hazard_rain_advice: "Не заезжайте на затопленные участки дорог.",
    hazard_air_title: "Загрязнение Воздуха и PM2.5",
    hazard_air_desc: "Концентрация пыли опасна для здоровья.",
    hazard_air_advice: "Используйте маску N95 и закройте окна.",
    hazard_official_title: "Официальное Предупреждение",
    hazard_official_desc: "Экстренное сообщение от метеорологической службы.",
    hazard_official_advice: "Следуйте инструкциям экстренных служб.",
    close: "Готово",
  },
  ko: {
    title: "기상 재해 감시기",
    subtitle: "뇌우, 강풍, 폭염 및 공기질 24시간 자동 모니터링",
    shield_active: "보호 활성화",
    shield_all_clear: "안전 — 기상 위험 없음",
    shield_hazards_found: "기상 위험 감지됨",
    monitoring_city: "감시 도시",
    test_btn: "경보 테스트",
    settings_btn: "설정",
    sound_on: "소리 켬",
    sound_muted: "음소거",
    notify_permission_cta: "알림 켜기",
    notify_enabled: "알림 활성",
    notify_blocked: "알림 차단됨",
    test_toast_title: "기상 감시 시스템 정상 작동",
    test_toast_desc: "테스트 경보음 알림입니다. 안전에 유의하세요!",
    hazard_thunderstorm_title: "강한 뇌우 및 낙뢰 경보",
    hazard_thunderstorm_desc: "인근에서 격렬한 번개, 돌풍 또는 우박이 감지되었습니다.",
    hazard_thunderstorm_advice: "즉시 실내로 대피하고 창문에서 멀리 떨어지세요.",
    hazard_wind_title: "강풍 및 돌풍 주의보",
    hazard_wind_desc: "순간 돌풍이 안전 기준치를 초과했습니다.",
    hazard_wind_advice: "외부 물건을 고정하고 낙하물에 주의하세요.",
    hazard_heat_title: "극심한 폭염 경보",
    hazard_heat_desc: "온열질환 및 탈수 위험이 매우 높습니다.",
    hazard_heat_advice: "물을 자주 마시고 시원한 실내에 머무르세요.",
    hazard_cold_title: "한파 및 도로 결빙 경보",
    hazard_cold_desc: "영하의 기온으로 블랙아이스 및 한파 위험이 있습니다.",
    hazard_cold_advice: "방한복을 착용하고 빙판길 운전에 주의하세요.",
    hazard_rain_title: "집중호우 및 침수 위험",
    hazard_rain_desc: "짧은 시간 많은 비로 도로 침수 가능성이 있습니다.",
    hazard_rain_advice: "지하차도나 범람 위험 하천 근처를 피하세요.",
    hazard_air_title: "초미세먼지 PM2.5 경보",
    hazard_air_desc: "미세먼지 수치가 건강에 위험한 수준입니다.",
    hazard_air_advice: "외출 시 보건용 마스크를 착용하고 창문을 닫으세요.",
    hazard_official_title: "기상청 공식 기상특보",
    hazard_official_desc: "기상 당국에서 발표한 공식 재난 경보입니다.",
    hazard_official_advice: "재난 당국의 지침을 준수하세요.",
    close: "완료",
  },
  id: {
    title: "Pemantau Cuaca Ekstrem",
    subtitle: "Pemantauan otomatis 24/7 untuk badai, angin kencang, gelombang panas, dan udara",
    shield_active: "Perisai Aktif",
    shield_all_clear: "Semua Aman — Kondisi Terkendali",
    shield_hazards_found: "Bahaya Cuaca Terdeteksi",
    monitoring_city: "Kota Terpantau",
    test_btn: "Uji Peringatan",
    settings_btn: "Pengaturan",
    sound_on: "Suara Nyala",
    sound_muted: "Hening",
    notify_permission_cta: "Aktifkan Notifikasi",
    notify_enabled: "Notifikasi Aktif",
    notify_blocked: "Notifikasi Diblokir",
    test_toast_title: "Pemantau Cuaca Aktif",
    test_toast_desc: "Notifikasi uji coba dengan nada peringatan. Tetap waspada!",
    hazard_thunderstorm_title: "Peringatan Badai Petir Parah",
    hazard_thunderstorm_desc: "Petir intens, angin kencang mendadak, atau hujan es terdeteksi.",
    hazard_thunderstorm_advice: "Segera berlindung di dalam bangunan yang kokoh dan hindari jendela.",
    hazard_wind_title: "Peringatan Angin Kencang",
    hazard_wind_desc: "Hembusan angin membahayakan keselamatan.",
    hazard_wind_advice: "Amankan barang di luar dan waspadai dahan pohon tumbang.",
    hazard_heat_title: "Peringatan Panas Ekstrem",
    hazard_heat_desc: "Suhu udara sangat tinggi dengan risiko sengatan panas dan dehidrasi.",
    hazard_heat_advice: "Perbanyak minum air dan hindari aktivitas berat di bawah terik matahari.",
    hazard_cold_title: "Peringatan Suhu Dingin",
    hazard_cold_desc: "Suhu turun drastis, waspadai risiko hipotermia.",
    hazard_cold_advice: "Gunakan pakaian hangat berlapis.",
    hazard_rain_title: "Peringatan Hujan Lebat & Banjir",
    hazard_rain_desc: "Curah hujan tinggi berpotensi menimbulkan genangan air cepat.",
    hazard_rain_advice: "Hindari melintasi jalanan yang tergenang banjir.",
    hazard_air_title: "Peringatan Kualitas Udara & PM2.5",
    hazard_air_desc: "Polusi partikel halus berbahaya bagi saluran pernapasan.",
    hazard_air_advice: "Gunakan masker N95 di luar ruangan dan tutup jendela rapat-rapat.",
    hazard_official_title: "Peringatan Dini Cuaca Resmi",
    hazard_official_desc: "Buletin cuaca darurat dari badan meteorologi setempat.",
    hazard_official_advice: "Patuhi instruksi keselamatan petugas penanggulangan bencana.",
    close: "Selesai",
  },
  vi: {
    title: "Giám Sát Thời Tiết Nguy Hiểm",
    subtitle: "Tự động theo dõi giông bão, gió giật, nắng nóng và chất lượng không khí 24/7",
    shield_active: "Bảo Vệ Đang Bật",
    shield_all_clear: "An Toàn — Không Có Nguy Hiểm",
    shield_hazards_found: "Phát Hiện Nguy Cơ Thời Tiết",
    monitoring_city: "Thành Phố Theo Dõi",
    test_btn: "Thử Chuông Báo",
    settings_btn: "Cài Đặt",
    sound_on: "Bật Âm",
    sound_muted: "Tắt Âm",
    notify_permission_cta: "Bật Thông Báo",
    notify_enabled: "Đã Bật Thông Báo",
    notify_blocked: "Thông Báo Bị Chặn",
    test_toast_title: "Hệ Thống Giám Sát Hoạt Động",
    test_toast_desc: "Đây là thông báo thử nghiệm kèm chuông báo. Chúc bạn luôn an toàn!",
    hazard_thunderstorm_title: "Cảnh Báo Giông Sét & Lốc",
    hazard_thunderstorm_desc: "Phát hiện sấm sét nguy hiểm, gió giật mạnh hoặc mưa đá.",
    hazard_thunderstorm_advice: "Lập tức tìm nơi trú ẩn kiên cố và tránh xa cửa sổ.",
    hazard_wind_title: "Cảnh Báo Gió Giật Mạnh",
    hazard_wind_desc: "Gió mạnh vượt ngưỡng an toàn, đề phòng cây đổ.",
    hazard_wind_advice: "Chằng chống đồ đạc ngoài trời và cẩn thận cành cây gãy.",
    hazard_heat_title: "Cảnh Báo Nắng Nóng Gay Gắt",
    hazard_heat_desc: "Nhiệt độ rất cao, nguy cơ sốc nhiệt và mất nước.",
    hazard_heat_advice: "Uống nhiều nước và hạn chế ra ngoài vào giờ cao điểm nắng nóng.",
    hazard_cold_title: "Cảnh Báo Rét Đậm & Băng Giá",
    hazard_cold_desc: "Nhiệt độ giảm sâu, nguy cơ trơn trượt trên đường.",
    hazard_cold_advice: "Mặc nhiều lớp áo ấm và chú ý an toàn khi di chuyển.",
    hazard_rain_title: "Mưa Lớn & Nguy Cơ Ngập Lụt",
    hazard_rain_desc: "Mưa xối xả có thể gây ngập úng đường phố cục bộ.",
    hazard_rain_advice: "Không lái xe qua vùng nước ngập sâu hoặc dòng nước chảy xiết.",
    hazard_air_title: "Ô Nhiễm Không Khí & Bụi Mịn PM2.5",
    hazard_air_desc: "Nồng độ bụi mịn ở mức có hại cho sức khỏe.",
    hazard_air_advice: "Đeo khẩu trang N95 khi ra ngoài và đóng kín cửa sổ.",
    hazard_official_title: "Bản Tin Thời Tiết Khẩn Cấp",
    hazard_official_desc: "Thông báo chính thức từ cơ quan khí tượng thủy văn.",
    hazard_official_advice: "Tuân thủ hướng dẫn phòng chống thiên tai của địa phương.",
    close: "Xong",
  },
  hi: {
    title: "गंभीर मौसम निगरानी",
    subtitle: "तूफान, तेज हवाओं, लू और वायु गुणवत्ता की 24/7 स्वचालित निगरानी",
    shield_active: "सुरक्षा सक्रिय",
    shield_all_clear: "सब सुरक्षित — कोई खतरा नहीं",
    shield_hazards_found: "मौसम का खतरा पहचाना गया",
    monitoring_city: "निगरानी शहर",
    test_btn: "परीक्षण चेतावनी",
    settings_btn: "सेटिंग्स",
    sound_on: "ध्वनि चालू",
    sound_muted: "मौन",
    notify_permission_cta: "सूचनाएं सक्षम करें",
    notify_enabled: "सूचनाएं सक्रिय",
    notify_blocked: "सूचनाएं अवरुद्ध",
    test_toast_title: "मौसम प्रहरी सक्रिय",
    test_toast_desc: "यह अलार्म टोन के साथ एक परीक्षण सूचना है। सुरक्षित रहें!",
    hazard_thunderstorm_title: "गंभीर आंधी और बिजली की चेतावनी",
    hazard_thunderstorm_desc: "क्षेत्र में भारी बिजली, आंधी या ओले गिरने की संभावना।",
    hazard_thunderstorm_advice: "तुरंत पक्के भवन में शरण लें और खिड़कियों से दूर रहें।",
    hazard_wind_title: "तेज आंधी और हवा की चेतावनी",
    hazard_wind_desc: "खतरनाक तेज हवाएं सुरक्षा सीमा से अधिक हैं।",
    hazard_wind_advice: "बाहरी वस्तुओं को सुरक्षित रखें और पेड़ की शाखाओं से सावधान रहें।",
    hazard_heat_title: "भीषण लू (हीटवेव) की चेतावनी",
    hazard_heat_desc: "खतरनाक उच्च तापमान, हीटस्ट्रोक और निर्जलीकरण का भारी जोखिम।",
    hazard_heat_advice: "खूब पानी पिएं और धूप में भारी शारीरिक श्रम से बचें।",
    hazard_cold_title: "कड़ाके की ठंड और पाले की चेतावनी",
    hazard_cold_desc: "शून्य से नीचे तापमान और सड़कों पर फिसलन का खतरा।",
    hazard_cold_advice: "गर्म ऊनी कपड़े पहनें और सावधानी से वाहन चलाएं।",
    hazard_rain_title: "भारी मूसलाधार बारिश और बाढ़ का खतरा",
    hazard_rain_desc: "अत्यधिक बारिश से निचले इलाकों में जलभराव हो सकता है।",
    hazard_rain_advice: "जलमग्न सड़कों और तेज बहाव वाले पानी से दूर रहें।",
    hazard_air_title: "खतरनाक वायु प्रदूषण और PM2.5 चेतावनी",
    hazard_air_desc: "हवा में हानिकारक सूक्ष्म कणों का उच्च स्तर।",
    hazard_air_advice: "बाहर N95 मास्क पहनें और घर की खिड़कियां बंद रखें।",
    hazard_official_title: "आधिकारिक मौसम बुलेटिन",
    hazard_official_desc: "मौसम विभाग द्वारा जारी आपातकालीन चेतावनी।",
    hazard_official_advice: "स्थानीय प्रशासन के सुरक्षा निर्देशों का पालन करें।",
    close: "पूर्ण",
  },
  ar: {
    title: "راصد الطقس القاسي",
    subtitle: "مراقبة تلقائية على مدار الساعة للعواصف والرياح وموجات الحر وجودة الهواء",
    shield_active: "الدرع نشط",
    shield_all_clear: "الأجواء آمنة — لا توجد مخاطر",
    shield_hazards_found: "تم رصد خطر مناخي عاجل",
    monitoring_city: "المدينة المراقبة",
    test_btn: "اختبار التنبيه",
    settings_btn: "الإعدادات",
    sound_on: "الصوت مفعّل",
    sound_muted: "مكتوم",
    notify_permission_cta: "تفعيل الإشعارات",
    notify_enabled: "الإشعارات نشطة",
    notify_blocked: "الإشعارات محظورة",
    test_toast_title: "راصد الطقس قيد التشغيل",
    test_toast_desc: "هذا إشعار تجريبي مع نغمة تحذيرية. نتمنى لكم السلامة!",
    hazard_thunderstorm_title: "عواصف رعدية وبرق شديد",
    hazard_thunderstorm_desc: "برق عنيف أو رياح هابطة أو بَرَد في المنطقة.",
    hazard_thunderstorm_advice: "احتمِ داخل مبنى آمن فوراً وابتعد عن النوافذ.",
    hazard_wind_title: "تحذير من رياح شديدة وعواصف",
    hazard_wind_desc: "هبات رياح خطيرة تتجاوز حدود السلامة.",
    hazard_wind_advice: "ثبّت الأشياء الخارجية المتطايرة واحذر من سقوط الأشجار.",
    hazard_heat_title: "تحذير من موجة حر قاسية",
    hazard_heat_desc: "درجات حرارة شديدة الارتفاع مع خطر ضربات الشمس.",
    hazard_heat_advice: "أكثر من شرب السوائل وابق في أماكن مكيفة.",
    hazard_cold_title: "تحذير من صقيع وبرد قارس",
    hazard_cold_desc: "انخفاض درجات الحرارة لما دون الصفر مع خطر تجمد الطرق.",
    hazard_cold_advice: "ارتدِ ملابس شتوية دافئة وتوخّ الحذر أثناء القيادة.",
    hazard_rain_title: "أمطار غزيرة وخطر السيول",
    hazard_rain_desc: "هطول أمطار كثيفة قد يسبب فيضانات مفاجئة.",
    hazard_rain_advice: "تجنب المرور في مجاري السيول والأماكن المنخفضة.",
    hazard_air_title: "تلوث الهواء وارتفاع PM2.5",
    hazard_air_desc: "مستويات الغبار والجسيمات تشكل خطراً على الجهاز التنفسي.",
    hazard_air_advice: "ارتدِ كمامة N95 في الخارج وأغلق النوافذ بإحكام.",
    hazard_official_title: "تحذير جوي رسمي",
    hazard_official_desc: "نشرة طوارئ رسمية صادرة عن هيئة الأرصاد الجوية.",
    hazard_official_advice: "اتبع إرشادات الدفاع المدني والسلطات المحلية.",
    close: "تم",
  },
};

/**
 * Intelligent meteorological translator for Thai TMD warning headlines.
 * Maps common Thai weather warning patterns into English and all 14 supported languages.
 */
export function translateThaiTmdTitle(thaiText: string): {
  en: string;
  th: string;
  es: string;
  fr: string;
  de: string;
  ja: string;
  zh: string;
  pt: string;
  ru: string;
  ko: string;
  id: string;
  vi: string;
  hi: string;
  ar: string;
} {
  const clean = thaiText.trim();

  // Pattern 1: Heavy to Very Heavy Rain & Flash Floods
  if (clean.includes("ฝนตกหนัก") || clean.includes("น้ำท่วม") || clean.includes("น้ำป่า")) {
    return {
      en: "TMD Warning: Heavy to Very Heavy Rain & Flash Flood Risk across Thailand",
      th: clean.startsWith("ประกาศ") ? clean : `ประกาศเตือนภัย: ${clean}`,
      es: "Alerta TMD: Lluvias torrenciales y riesgo de inundaciones repentinas en Tailandia",
      fr: "Alerte TMD: Pluies torrentielles et risque d'inondations soudaines en Thaïlande",
      de: "TMD-Warnung: Starkregen und Sturzflutgefahr in Teilen Thailands",
      ja: "タイ気象局警報: 局地的な激しい豪雨と鉄砲水・浸水警戒",
      zh: "泰国气象局预警: 强降雨与突发山洪内涝预警",
      pt: "Aviso TMD: Chuvas intensas a torrenciais e risco de enxurradas na Tailândia",
      ru: "Предупреждение TMD: Проливные дожди и риск паводков в Таиланде",
      ko: "태국 기상청 특보: 집중호우 및 돌발 홍수·침수 경보",
      id: "Peringatan TMD: Hujan Sangat Lebat & Risiko Banjir Bandang di Thailand",
      vi: "Cảnh báo TMD: Mưa rất to và nguy cơ lũ quét, ngập lụt tại Thái Lan",
      hi: "TMD चेतावनी: थाईलैंड में भारी बारिश और अचानक बाढ़ का खतरा",
      ar: "تحذير الأرصاد التايلاندية: أمطار غزيرة جداً وخطر سيول جارفة",
    };
  }

  // Pattern 2: Summer Thunderstorms, Hail, and Squalls
  if (clean.includes("พายุฤดูร้อน") || clean.includes("พายุฝนฟ้าคะนอง") || clean.includes("ลูกเห็บ")) {
    return {
      en: "TMD Warning: Severe Summer Thunderstorms, Gale Gusts & Hail in Upper Thailand",
      th: clean.startsWith("ประกาศ") ? clean : `ประกาศเตือนภัย: ${clean}`,
      es: "Alerta TMD: Tormentas severas de verano, vendavales y granizo",
      fr: "Alerte TMD: Violents orages d'été, rafales de vent et grêle",
      de: "TMD-Warnung: Schwere Sommergewitter mit orkanartigen Böen und Hagel",
      ja: "タイ気象局警報: 激しい熱帯性雷雨・突風・降雹注意報",
      zh: "泰国气象局预警: 夏季强对流雷暴、雷雨大风与冰雹预警",
      pt: "Aviso TMD: Tempestades severas de verão, ventania e granizo",
      ru: "Предупреждение TMD: Летние грозы, шквальный ветер и град",
      ko: "태국 기상청 특보: 여름철 돌풍과 우박을 동반한 강한 뇌우 경보",
      id: "Peringatan TMD: Badai Petir Parah, Angin Kencang & Hujan Es",
      vi: "Cảnh báo TMD: Giông bão mùa hè nguy hiểm, gió giật mạnh và mưa đá",
      hi: "TMD चेतावनी: थाईलैंड में भयंकर आंधी, तेज हवाएं और ओलावृष्टि",
      ar: "تحذير الأرصاد التايلاندية: عواصف رعدية صيفية عنيفة ورياح هابطة وبَرَد",
    };
  }

  // Pattern 3: Strong Winds and High Waves in Gulf / Andaman Sea
  if (clean.includes("คลื่นลมแรง") || clean.includes("ทะเลอันดามัน") || clean.includes("อ่าวไทย")) {
    return {
      en: "TMD Advisory: High Waves (2–3m) & Strong Winds in Gulf of Thailand and Andaman Sea",
      th: clean.startsWith("ประกาศ") ? clean : `ประกาศเตือนภัย: ${clean}`,
      es: "Aviso TMD: Olas altas (2–3m) y vientos fuertes en el Golfo de Tailandia y mar de Andamán",
      fr: "Avis TMD: Fortes vagues (2–3m) et vents violents dans le golfe de Thaïlande",
      de: "TMD-Warnung: Hoher Wellengang (2–3m) und Starkwind im Golf von Thailand",
      ja: "タイ気象局海上注意報: タイランド湾およびアンダマン海の高波(2〜3m)・強風警報",
      zh: "泰国气象局海洋预警: 泰国湾及安达曼海大风与巨浪(2-3米)警报",
      pt: "Aviso TMD: Ondas altas (2–3m) e ventos fortes no Golfo da Tailândia e Mar de Andamão",
      ru: "Предупреждение TMD: Высокие волны (2–3 м) и сильный ветер в Сиамском заливе",
      ko: "태국 기상청 해상특보: 태국만 및 안다만해 높은 파도(2~3m) 및 강풍 경보",
      id: "Peringatan TMD: Gelombang Tinggi (2–3m) & Angin Kencang di Teluk Thailand",
      vi: "Cảnh báo TMD: Sóng biển cao (2–3m) và gió mạnh tại Vịnh Thái Lan",
      hi: "TMD समुद्री चेतावनी: थाईलैंड की खाड़ी में ऊंची लहरें (2-3 मीटर) और तेज हवाएं",
      ar: "تحذير بحري تايلاندي: أمواج عالية (2-3 م) ورياح شديدة في خليج تايلاند",
    };
  }

  // Pattern 4: Cold Front & Temperature Drop
  if (clean.includes("อากาศหนาว") || clean.includes("อุณหภูมิลดลง")) {
    return {
      en: "TMD Advisory: Cold Front & Significant Drop in Temperatures across Thailand",
      th: clean.startsWith("ประกาศ") ? clean : `ประกาศเตือนภัย: ${clean}`,
      es: "Aviso TMD: Frente frío y descenso significativo de temperaturas en Tailandia",
      fr: "Avis TMD: Front froid et nette baisse des températures en Thaïlande",
      de: "TMD-Warnung: Kaltfront mit spürbarem Temperaturrückgang in Thailand",
      ja: "タイ気象局注意報: 寒冷前線の通過による急激な気温低下",
      zh: "泰国气象局提示: 冷空气来袭，全国多地气温明显下降",
      pt: "Aviso TMD: Frente fria e queda brusca de temperatura na Tailândia",
      ru: "Предупреждение TMD: Холодный фронт и заметное понижение температуры",
      ko: "태국 기상청 주의보: 한랭전선 통과로 인한 기온 급강하 안내",
      id: "Peringatan TMD: Gelombang Dingin & Penurunan Suhu Signifikan",
      vi: "Cảnh báo TMD: Không khí lạnh tăng cường và nhiệt độ giảm mạnh",
      hi: "TMD चेतावनी: शीत लहर और थाईलैंड में तापमान में भारी गिरावट",
      ar: "تحذير الأرصاد التايلاندية: جبهة هوائية باردة وانخفاض ملحوظ في درجات الحرارة",
    };
  }

  // Fallback: General TMD Severe Weather Bulletin
  return {
    en: `TMD Weather Warning: ${clean}`,
    th: clean.startsWith("ประกาศ") ? clean : `ประกาศเตือนภัย: ${clean}`,
    es: `Aviso Meteorológico TMD: ${clean}`,
    fr: `Bulletin Météo TMD: ${clean}`,
    de: `TMD-Wetterwarnung: ${clean}`,
    ja: `タイ気象局公式発表: ${clean}`,
    zh: `泰国气象局灾害公告: ${clean}`,
    pt: `Boletim Meteorológico TMD: ${clean}`,
    ru: `Официальное предупреждение TMD: ${clean}`,
    ko: `태국 기상청 공식 발표: ${clean}`,
    id: `Pemberitahuan Cuaca TMD: ${clean}`,
    vi: `Thông báo thời tiết TMD: ${clean}`,
    hi: `TMD आधिकारिक मौसम बुलेटिन: ${clean}`,
    ar: `نشرة الأرصاد الجوية التايلاندية: ${clean}`,
  };
}

/**
 * Universal resolver to pick the correct language headline from an alert item.
 */
export function resolveAlertHeadline(
  alert: {
    headline?: string;
    headlineEn?: string;
    headlineTh?: string;
    headlines?: Record<string, string>;
    text?: string;
  },
  lang: string
): string {
  const normLang = (lang || "en").slice(0, 2).toLowerCase();

  // 1. Direct multilingual lookup if provided
  if (alert.headlines && alert.headlines[normLang]) {
    return alert.headlines[normLang];
  }

  // 2. Thai exact match
  if (normLang === "th" && alert.headlineTh) {
    return alert.headlineTh;
  }

  // 3. If Thai text is present but user wants English / other language
  if (normLang !== "th" && alert.headlineTh && !alert.headlineEn) {
    const translated = translateThaiTmdTitle(alert.headlineTh);
    return translated[normLang as keyof typeof translated] || translated.en;
  }

  // 4. Default to English or general headline
  return alert.headlineEn || alert.headline || alert.text || "";
}

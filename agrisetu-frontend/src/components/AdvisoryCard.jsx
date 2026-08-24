import React from 'react'
import { useTranslation } from 'react-i18next'

export default function AdvisoryCard({ advisory }) {
  const { t, i18n } = useTranslation()

  if (!advisory) return null

  const lang = i18n.language || 'en'
  const topCrop = advisory.recommendations?.[0]

  const practiceMap = {
    hi: {
      'Mulching': 'मल्चिंग (आच्छादन)',
      'Crop Rotation': 'फसल चक्र (फसल चक्रण)',
      'Cover Cropping': 'आवरण फसल (कवर क्रॉपिंग)',
      'Reduced Tillage': 'कम जुताई (न्यूनतम जुताई)',
      'Intercropping': 'अंतर-फसल (इंटरक्रॉपिंग)',
      'Raised Bed Farming': 'उठी हुई क्यारी तकनीक',
      'Soil Liming': 'मृदा चूना उपचार',
      'Organic Matter Addition': 'जैविक खाद जोड़ना',
    },
    mr: {
      'Mulching': 'मल्चिंग (आच्छादन)',
      'Crop Rotation': 'पीकपालट (पीक आलटून-पालटून)',
      'Cover Cropping': 'आच्छादन पिके (कव्हर पिके)',
      'Reduced Tillage': 'कमी नांगरणी (किमान मशागत)',
      'Intercropping': 'आंतरपीक पद्धती',
      'Raised Bed Farming': 'गादी वाफा पद्धत',
      'Soil Liming': 'माती चुनखडी उपचार',
      'Organic Matter Addition': 'सेन्द्रिय खत वापर',
    }
  }

  const cropNameMap = {
    hi: {
      "Maize": "मक्का (Maize)",
      "Wheat": "गेहूं (Wheat)",
      "Rice": "चावल (Rice)",
      "Cotton": "कपास (Cotton)",
      "Soybean": "सोयाबीन (Soybean)",
      "Sugarcane": "गन्ना (Sugarcane)",
      "Chickpea": "चना (Chickpea)",
      "Banana": "केला (Banana)",
      "Jute": "पटसन (Jute)",
      "Mango": "आम (Mango)",
      "Grapes": "अंगूर (Grapes)",
    },
    mr: {
      "Maize": "मका (Maize)",
      "Wheat": "गहू (Wheat)",
      "Rice": "तांदूळ (Rice)",
      "Cotton": "कापूस (Cotton)",
      "Soybean": "सोयाबीन (Soybean)",
      "Sugarcane": "ऊस (Sugarcane)",
      "Chickpea": "हरभरा (Chickpea)",
      "Banana": "केळी (Banana)",
      "Jute": "ताग (Jute)",
      "Mango": "आंबा (Mango)",
      "Grapes": "द्राक्षे (Grapes)",
    }
  }

  const priorityMap = {
    hi: {
      "high": "उच्च प्राथमिकता",
      "medium": "मध्यम प्राथमिकता",
      "low": "सामान्य प्राथमिकता",
    },
    mr: {
      "high": "महत्त्वाची प्राधान्यता",
      "medium": "मध्यम प्राधान्यता",
      "low": "सामान्य प्राधान्यता",
    }
  }

  const descriptionMap = {
    hi: {
      "Mulching": "नमी संरक्षण, खरपतवार नियंत्रण और मृदा स्वास्थ्य सुधार के लिए जैविक मल्च (फसल अवशेष, पुआल) का प्रयोग करें।",
      "Crop Rotation": "कीट चक्र तोड़ने और मृदा उर्वरता बढ़ाने के लिए हर मौसम में अनाज, दलहन और तिलहन के बीच फसल चक्र अपनाएं।",
      "Intercropping": "पिछली फसल दलहनी थी। आपकी मिट्टी में प्राकृतिक नाइट्रोजन क्रेडिट है। गेहूं या मक्का जैसी फसल के साथ अंतर-फसल अपनाएं।",
      "Cover Cropping": "आपके खेत का NDVI कम (< 0.3) है। कटाई के बाद मृदा क्षरण रोकने और जैविक कार्बन बढ़ाने के लिए आवरण फसलें लगाएं।",
      "Reduced Tillage": "आपकी मिट्टी में जैविक कार्बन कम (< 0.5%) है। मृदा संरचना बनाए रखने के लिए न्यूनतम जुताई अपनाएं।",
      "Raised Bed Farming": "भारी बारिश की संभावना है। जलभराव से बचने के लिए उठी हुई क्यारियों (रेज्ड बेड) का उपयोग करें।",
      "Soil Liming": "आपकी मिट्टी का पीएच अम्लीय है। पीएच सुधारने के लिए 2-4 टन/हेक्टेयर कृषि चूना लगाएं।",
      "Organic Matter Addition": "आपकी मिट्टी का पीएच क्षारीय है। मृदा क्षमता में सुधार के लिए कंपोस्ट और जैविक पदार्थ मिलाएं।",
    },
    mr: {
      "Mulching": "ओलावा टिकवून ठेवण्यासाठी, तण नियंत्रणासाठी आणि मातीचे आरोग्य सुधारण्यासाठी सेंद्रिय मल्चिंग (पिकाचे अवशेष, पेंढा) वापरा.",
      "Crop Rotation": "किडींचा प्रादुर्भाव रोखण्यासाठी आणि मातीची सुपीकता वाढवण्यासाठी प्रत्येक हंगामात तृणधान्ये, कडधान्ये आणि गरोदर पिकांचे फेरपालट करा.",
      "Intercropping": "मागील पीक कडधान्य होते. तुमच्या मातीत नैसर्गिक नत्रसाठा उपलब्ध आहे. याचा पुरेपूर वापर करण्यासाठी गहू किंवा मक्यासोबत आंतरपीक घ्या.",
      "Cover Cropping": "तुमच्या शेताचा NDVI कमी (< ०.३) आहे. कापणीनंतर मातीची धूप थांबवण्यासाठी आणि सेन्द्रिय कर्ब वाढवण्यासाठी आच्छादन पिके घ्या.",
      "Reduced Tillage": "तुमच्या मातीतील सेन्द्रिय कर्ब कमी (< ०.५%) आहे. मातीची रचना टिकवण्यासाठी कमीत कमी नांगरणी (किमान मशागत) करा.",
      "Raised Bed Farming": "मुसळधार पावसाची शक्यता आहे. पाणी साचणे रोखण्यासाठी गादी वाफा (रेज्ड बेड) किंवा सरी-वरंबा पद्धतीचा वापर करा.",
      "Soil Liming": "तुमच्या मातीचा सामू (pH) आम्लयुक्त आहे. सामू सुधारण्यासाठी दर हेक्टरी २-४ टन कृषी सुका चूना वापरा.",
      "Organic Matter Addition": "तुमच्या मातीचा सामू (pH) क्षारयुक्त आहे. मातीची सुपीकता सुधारण्यासाठी कंपोस्ट खत आणि सेंद्रिय पदार्थ मिसळा.",
    }
  }

  const sowingMap = {
    hi: {
      "February - March": "फरवरी - मार्च",
      "June 15 - July 15": "15 जून - 15 जुलाई",
      "October 15 - November 30": "15 अक्टूबर - 30 नवंबर",
      "June 1 - July 15": "1 जून - 15 जुलाई",
      "May 15 - June 30": "15 मई - 30 जून",
      "Year-round": "वर्षभर",
    },
    mr: {
      "February - March": "फेब्रुवारी - मार्च",
      "June 15 - July 15": "15 जून - 15 जुलै",
      "October 15 - November 30": "15 ऑक्टोबर - 30 नोव्हेंबर",
      "June 1 - July 15": "1 जून - 15 जुलै",
      "May 15 - June 30": "15 मे - 30 जून",
      "Year-round": "वर्षभर",
    }
  }

  return (
    <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/40 shadow-sm max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center">
          <span className="material-symbols-outlined">lightbulb</span>
        </div>
        <div>
          <h3 className="text-xl font-display font-bold text-primary">{t('advisory')}</h3>
          <p className="text-xs text-on-surface-variant font-mono">{t('crop_recommendations')}</p>
        </div>
      </div>

      {/* Top Crop Recommendation */}
      {topCrop && (
        <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/30 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="inline-flex items-center gap-1 bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold mb-2">
                {t('crop_recommendations')}
              </span>
              <h4 className="text-2xl font-bold text-primary">
                {cropNameMap[lang]?.[topCrop.crop] || topCrop.crop}
              </h4>
            </div>
            <div className="bg-primary text-on-primary px-3.5 py-1.5 rounded-full text-sm font-mono font-bold">
              {((topCrop.confidence || 0.88) * 100).toFixed(0)}% {t('confidence')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-surface p-3 rounded-xl border border-outline-variant/30 flex flex-col">
              <span className="text-xs text-on-surface-variant font-mono">{t('sowing_window')}</span>
              <span className="text-sm font-bold text-on-surface mt-1">
                {sowingMap[lang]?.[topCrop.sowing_window] || topCrop.sowing_window}
              </span>
            </div>
            <div className="bg-surface p-3 rounded-xl border border-outline-variant/30 flex flex-col">
              <span className="text-xs text-on-surface-variant font-mono">{t('irrigation')}</span>
              <span className="text-sm font-bold text-on-surface mt-1">{t('every_x_days', { days: topCrop.irrigation_days })}</span>
            </div>
          </div>
        </div>
      )}

      {/* Alternate Crop Recommendations */}
      {advisory.recommendations?.slice(1, 3).length > 0 && (
        <div>
          <h4 className="text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
            {t('crop_recommendations')}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {advisory.recommendations.slice(1, 3).map((rec, i) => (
              <div key={i} className="bg-surface p-3 rounded-2xl border border-outline-variant/30 flex justify-between items-center text-xs">
                <span className="font-bold text-primary">{cropNameMap[lang]?.[rec.crop] || rec.crop}</span>
                <span className="font-mono text-secondary font-semibold">
                  {((rec.confidence || 0.75) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regenerative Practices */}
      {advisory.regenerative_practices?.length > 0 && (
        <div>
          <h4 className="text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-sm">eco</span>
            {t('regenerative_practices')}
          </h4>
          <div className="space-y-2.5">
            {advisory.regenerative_practices.map((p, i) => (
              <div
                key={i}
                className="bg-surface p-3.5 rounded-2xl border-l-4 border-primary text-xs space-y-1 shadow-sm"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-on-surface">
                    {practiceMap[lang]?.[p.practice] || p.practice}
                  </span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-primary-fixed/40 text-on-primary-fixed-variant">
                    {priorityMap[lang]?.[p.priority?.toLowerCase()] || `${p.priority || 'High'} Priority`}
                  </span>
                </div>
                <p className="text-on-surface-variant leading-relaxed">
                  {descriptionMap[lang]?.[p.practice] || p.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Alerts */}
      {advisory.risk_alerts?.length > 0 && (
        <div className="bg-tertiary-fixed/30 border border-tertiary-fixed-dim/50 rounded-2xl p-4">
          <h4 className="text-xs font-mono font-semibold text-on-tertiary-container uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">warning</span>
            Active Agronomic Alerts
          </h4>
          <div className="space-y-1 text-xs text-on-tertiary-container">
            {advisory.risk_alerts.map((alert, i) => (
              <p key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                <span>{alert}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

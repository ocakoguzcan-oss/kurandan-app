"""content/dualar.json'a diğer dillerdeki anlam, ne için okunur ve kaynak bilgisini ekler.
Kullanım: python3 scripts/dua-ceviri.py <ceviri-dosyalari...>
Her satır: id|en_neIcin|en_meal|de_neIcin|de_meal|fr_neIcin|fr_meal|ru_neIcin|ru_meal|ar_neIcin
Arapçada meal yazılmaz (duanın kendisi Arapçadır)."""
import json, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
P = os.path.join(ROOT, 'content', 'dualar.json')
d = json.load(open(P, encoding='utf-8'))

SURE = {  # Türkçe ad → (no, en, de, fr, ru, ar)
    'Bakara': (2, 'Al-Baqarah', 'al-Baqara', 'Al-Baqara', 'аль-Бакара', 'البقرة'),
    'Âl-i İmrân': (3, "Al 'Imran", 'Al Imran', 'Al Imran', 'Аль Имран', 'آل عمران'),
    'Mâide': (5, "Al-Ma'idah", "al-Ma'ida", "Al-Ma'ida", 'аль-Маида', 'المائدة'),
    'A‘râf': (7, "Al-A'raf", "al-A'raf", "Al-A'raf", 'аль-Араф', 'الأعراف'),
    'Tevbe': (9, 'At-Tawbah', 'at-Tauba', 'At-Tawba', 'ат-Тауба', 'التوبة'),
    'İbrâhîm': (14, 'Ibrahim', 'Ibrahim', 'Ibrahim', 'Ибрахим', 'إبراهيم'),
    'İsrâ': (17, "Al-Isra'", "al-Isra'", "Al-Isra'", 'аль-Исра', 'الإسراء'),
    'Kehf': (18, 'Al-Kahf', 'al-Kahf', 'Al-Kahf', 'аль-Кахф', 'الكهف'),
    'Tâhâ': (20, 'Ta-Ha', 'Ta-Ha', 'Ta-Ha', 'Та Ха', 'طه'),
    'Enbiyâ': (21, "Al-Anbiya'", "al-Anbiya'", "Al-Anbiya'", 'аль-Анбия', 'الأنبياء'),
    'Mü’minûn': (23, "Al-Mu'minun", "al-Mu'minun", "Al-Mu'minun", 'аль-Муминун', 'المؤمنون'),
    'Furkân': (25, 'Al-Furqan', 'al-Furqan', 'Al-Furqan', 'аль-Фуркан', 'الفرقان'),
    'Kasas': (28, 'Al-Qasas', 'al-Qasas', 'Al-Qasas', 'аль-Касас', 'القصص'),
    'Zuhruf': (43, 'Az-Zukhruf', 'az-Zuchruf', 'Az-Zukhruf', 'аз-Зухруф', 'الزخرف'),
    'Ahkâf': (46, 'Al-Ahqaf', 'al-Ahqaf', 'Al-Ahqaf', 'аль-Ахкаф', 'الأحقاف'),
    'Kalem': (68, 'Al-Qalam', 'al-Qalam', 'Al-Qalam', 'аль-Калям', 'القلم'),
    'Felak': (113, 'Al-Falaq', 'al-Falaq', 'Al-Falaq', 'аль-Фаляк', 'الفلق'),
    'Nâs': (114, 'An-Nas', 'an-Nas', 'An-Nas', 'ан-Нас', 'الناس'),
}
KITAP = {  # kitap → (en, de, fr, ru, ar)
    'Buhârî': ('Bukhari', 'Buchari', 'Boukhari', 'Бухари', 'البخاري'),
    'Müslim': ('Muslim', 'Muslim', 'Mouslim', 'Муслим', 'مسلم'),
    'Tirmizî': ('Tirmidhi', 'Tirmidhi', 'Tirmidhi', 'Тирмизи', 'الترمذي'),
    'Ebû Dâvûd': ('Abu Dawud', 'Abu Dawud', 'Abou Dawoud', 'Абу Дауд', 'أبو داود'),
    'İbn Mâce': ('Ibn Majah', 'Ibn Madscha', 'Ibn Mâja', 'Ибн Маджа', 'ابن ماجه'),
}
BAB = {  # bölüm → (latin, ar)
    'Kader': ('Qadar', 'القدر'), 'Nikâh': ('Nikah', 'النكاح'), 'Merdâ': ('Marda', 'المرضى'), 'Selâm': ('Salam', 'السلام'),
    'Edeb': ('Adab', 'الأدب'), 'Dua': ("Du'a", 'الدعاء'), 'İkâmet': ('Iqamah', 'إقامة الصلاة'), 'Daavât': ("Da'awat", 'الدعوات'),
    'Enbiyâ': ("Anbiya'", 'أحاديث الأنبياء'), 'Libâs': ('Libas', 'اللباس'),
}
LI = {'en': 0, 'de': 1, 'fr': 2, 'ru': 3, 'ar': 4}

def kaynak(src, lang):
    out = []
    for part in src.split(';'):
        part = re.sub(r'\s*\(.*\)$', '', part.strip())
        m = re.match(r'^(.+?) Suresi(?:, ([\d-]+))?$', part)
        if m:
            no, en, de, fr, ru, ar = SURE[m.group(1)]
            v = m.group(2)
            if lang == 'ar':
                out.append(f'سورة {ar}' + (f'، {v}' if v else ''))
            else:
                name = {'en': en, 'de': f'Sure {de}', 'fr': f'Sourate {fr}', 'ru': f'Сура «{ru}»'}[lang]
                out.append(f'{name} {no}:{v}' if v else f'{name} ({no})')
            continue
        m = re.match(r'^(.+?), (\S+?) (\d+)$', part)
        assert m and m.group(1) in KITAP and m.group(2) in BAB, part
        k = KITAP[m.group(1)][LI[lang]]
        b = BAB[m.group(2)]
        out.append(f'{k}، {b[1]} {m.group(3)}' if lang == 'ar' else f'{k}, {b[0]} {m.group(3)}')
    return ('؛ ' if lang == 'ar' else '; ').join(out)

KAT = {
    'ahiret': [('This World & Hereafter', 'For the good of both worlds, acceptance and steadfastness'), ('Diesseits & Jenseits', 'Für das Gute in beiden Welten, Annahme und Standhaftigkeit'), ('Ici-bas & au-delà', 'Pour le bien des deux mondes, l’acceptation et la constance'), ('Этот мир и вечный', 'О благе обоих миров, принятии и стойкости'), ('الدنيا والآخرة', 'لخير الدارين والقبول والثبات')],
    'aile': [('Family & Marriage', 'For spouses, home and marriage'), ('Familie & Ehe', 'Für Ehepartner, Zuhause und Ehe'), ('Famille & mariage', 'Pour le conjoint, le foyer et le mariage'), ('Семья и брак', 'О супругах, доме и браке'), ('الأسرة والزواج', 'للزوج والبيت والزواج')],
    'evlat': [('Parents & Children', 'For parents and righteous children'), ('Eltern & Kinder', 'Für Eltern und rechtschaffene Kinder'), ('Parents & enfants', 'Pour les parents et une descendance pieuse'), ('Родители и дети', 'О родителях и праведных детях'), ('الوالدان والذرية', 'للوالدين والذرية الصالحة')],
    'saglik': [('Health & Healing', 'In illness and for well-being'), ('Gesundheit & Heilung', 'In Krankheit und für Wohlergehen'), ('Santé & guérison', 'Dans la maladie et pour le bien-être'), ('Здоровье и исцеление', 'В болезни и о благополучии'), ('الصحة والشفاء', 'في المرض ولطلب العافية')],
    'rizik': [('Provision & Blessing', 'For lawful provision, livelihood and debt'), ('Versorgung & Segen', 'Für erlaubten Lebensunterhalt und gegen Schulden'), ('Subsistance & baraka', 'Pour une subsistance licite, le gagne-pain et les dettes'), ('Удел и благодать', 'О дозволенном уделе, пропитании и долгах'), ('الرزق والبركة', 'للرزق الحلال والمعيشة والدَّين')],
    'nazar': [('Evil Eye & Protection', 'Protection from the evil eye, harm and Satan'), ('Böser Blick & Schutz', 'Schutz vor bösem Blick, Übel und Satan'), ('Mauvais œil & protection', 'Protection contre le mauvais œil, le mal et Satan'), ('Сглаз и защита', 'Защита от сглаза, зла и шайтана'), ('العين والتحصين', 'للتحصن من العين والشر والشيطان')],
    'huzur': [('Distress & Peace', 'In times of worry, anxiety and hardship'), ('Kummer & Ruhe', 'In Zeiten von Sorge, Angst und Not'), ('Détresse & sérénité', 'Dans le souci, l’angoisse et l’épreuve'), ('Тревога и покой', 'В минуты горя, тревоги и трудностей'), ('الكرب والطمأنينة', 'في أوقات الهم والقلق والضيق')],
    'tovbe': [('Repentance & Forgiveness', 'To ask for forgiveness'), ('Reue & Vergebung', 'Um Vergebung zu bitten'), ('Repentir & pardon', 'Pour demander pardon'), ('Покаяние и прощение', 'О прощении'), ('التوبة والعفو', 'لطلب المغفرة')],
    'gunluk': [('Daily Supplications', 'Morning and evening, at bedtime, at meals, on the road'), ('Tägliche Bittgebete', 'Morgens und abends, beim Schlafen, Essen, unterwegs'), ('Invocations quotidiennes', 'Matin et soir, au coucher, aux repas, en route'), ('Ежедневные мольбы', 'Утром и вечером, перед сном, за едой, в пути'), ('أدعية يومية', 'الصباح والمساء والنوم والطعام والسفر')],
}
ORDER = ['en', 'de', 'fr', 'ru', 'ar']
for k in d['kategoriler']:
    k['ceviri'] = {l: {'ad': KAT[k['id']][i][0], 'aciklama': KAT[k['id']][i][1]} for i, l in enumerate(ORDER)}

rows = {}
for f in sys.argv[1:]:
    for line in open(f, encoding='utf-8'):
        line = line.rstrip('\n')
        if not line:
            continue
        p = line.split('|')
        assert len(p) == 10, (p[0], len(p))
        rows[p[0]] = p
ids = [x['id'] for x in d['dualar']]
missing = [i for i in ids if i not in rows]
assert not missing, missing
for x in d['dualar']:
    p = rows[x['id']]
    c = {}
    for i, l in enumerate(['en', 'de', 'fr', 'ru']):
        c[l] = {'neIcin': p[1 + 2 * i], 'meal': p[2 + 2 * i], 'kaynak': kaynak(x['kaynak'], l)}
    c['ar'] = {'neIcin': p[9], 'kaynak': kaynak(x['kaynak'], 'ar')}
    if x['id'] == 'nazar-kelimat':
        c['en']['kaynak'] += ' (for children: “U‘idhuka…”)'
        c['de']['kaynak'] += ' (für Kinder: „U‘idhuka…“)'
        c['fr']['kaynak'] += ' (pour les enfants : « U‘îdhouka… »)'
        c['ru']['kaynak'] += ' (для детей: «У‘изука…»)'
        c['ar']['kaynak'] += ' (للأطفال: «أعيذك…»)'
    x['ceviri'] = c
d['surum'] = max(d['surum'], 2)
json.dump(d, open(P, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(len(rows), 'dua çevrildi; örnek:', d['dualar'][13]['ceviri']['en']['kaynak'], '|', d['dualar'][0]['ceviri']['ar']['kaynak'])

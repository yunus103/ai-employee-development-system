import pandas as pd
import json
import random
import numpy as np

print("Etiketleme (Labeling) sureci basladi...")

# Set seed for reproducibility (Her calistirdigimizda %10 oranli sapmalar ayni kalsin diye)
random.seed(42)
np.random.seed(42)

# Dosya yollari
actions_path = 'actions_master.json'
dataset_path = 'data/dataset_final.csv'
output_path = 'employees_labels.csv'

# Verileri yukle
with open(actions_path, 'r', encoding='utf-8') as f:
    actions = json.load(f)

# Aksiyonlari yetkinliklere gore grupla ki kaydirma, ezme islemlerini (index ile) yapabilelim
comp_actions = {}
action_ids = []
for a in actions:
    tc = a['target_competency']
    aid = a['action_id']
    if tc not in comp_actions:
        comp_actions[tc] = []
    comp_actions[tc].append(a)
    action_ids.append(aid)

# action_id'ye gore siralayalim (orn: CORE_COMM_01, CORE_COMM_02...)
for tc in comp_actions:
    comp_actions[tc].sort(key=lambda x: x['action_id'])

def get_base_action(comp, score):
    for a in comp_actions[comp]:
        rules = a['selection_rules']
        if rules['min_score'] <= score <= rules['max_score']:
            return a['action_id']
    
    # Skaladan tasan cok kucuk/buyuk floating point kaymalari icin kurtarici:
    if score < comp_actions[comp][0]['selection_rules']['min_score']:
        return comp_actions[comp][0]['action_id']
    return comp_actions[comp][-1]['action_id']

def get_action_by_index(comp, index):
    idx = max(0, min(index, len(comp_actions[comp]) - 1))
    return comp_actions[comp][idx]['action_id']

def get_index_by_action(comp, action_id):
    for idx, a in enumerate(comp_actions[comp]):
        if a['action_id'] == action_id:
            return idx
    return 0

df = pd.read_csv(dataset_path)

# Kural 6 icin performans metriginin Top %20 siniri bulalim
perf_80th = df['PerformanceScore'].quantile(0.80)

labeled_rows = []

competencies = [
    'Core_Communication', 'Core_Teamwork', 'Core_ProblemSolving', 
    'Core_Adaptability', 'Core_TimeManagement', 'Core_Initiative', 
    'Core_Accountability', 'Core_LearningAgility', 
    'Dept_Comp1', 'Dept_Comp2', 'Dept_Comp3', 
    'Role_Comp1', 'Role_Comp2'
]

# Tum calisanlari satit satiri (fabrika banti gibi) isleyelim
for idx, row in df.iterrows():
    # Bu calisanin 47 aksiyonunu once tamamen 0 yap
    emp_labels = {aid: 0 for aid in action_ids}
    
    for comp in competencies:
        score = row[comp]
        
        # 1. A ASAMASI: Baz Kural (Sadece puana bakar)
        action_id = get_base_action(comp, score)
        
        # 2. B ASAMASI: Uzman Kurallari (Override)
        
        # Kural 1: Yonetici Hassasiyeti
        if 'Manager' in str(row['JobRole']):
            if comp in ['Core_Accountability', 'Core_Initiative'] and score < 2.5:
                action_id = get_action_by_index(comp, 0) # En agir pratik aksiyona ez
                
        # Kural 2: Tukenmislik
        if row['WorkLifeBalance'] <= 2 and row['JobSatisfaction'] <= 2:
            # Onlari yormayacak sekilde (listenin sonundaki) en rahat/easy aksiyona ez
            action_id = get_action_by_index(comp, len(comp_actions[comp])-1) 
            
        # Kural 3: Satis Departmani Agresifligi
        if row['Department'] == 'Sales & Marketing' and comp == 'Core_Communication' and score < 3.0:
            action_id = get_action_by_index(comp, 0) # En agir egitime ez
            
        # Kural 4: Teknoloji Odak
        if row['Department'] == 'Technology' and comp == 'Core_ProblemSolving' and score < 3.0:
            action_id = get_action_by_index(comp, 0) # En agir egitime ez
            
        # Kural 5: Kidemli Yenileme
        if row['TotalWorkingYears'] >= 10 and row['YearsAtCompany'] >= 5:
            # Sadece Departman/Rol skoru dipteyse calisir:
            if (comp.startswith('Dept_') or comp.startswith('Role_')) and score < 2.0:
                action_id = get_action_by_index(comp, 1) # Action_01 yerine Action_02'ye ez (Farkindalik)
                    
        # Kural 6: Mukkemmel Asosyal (Toxic)
        if row['PerformanceScore'] > perf_80th and comp == 'Core_Teamwork' and score < 2.0:
            # Action_01 almak yerine Action_03 alsar
            action_id = get_action_by_index(comp, 2)
            
        # Kural 7: Caylak Kurtarma
        if row['YearsAtCompany'] <= 2 and comp == 'Core_Adaptability' and score < 2.5:
            action_id = get_action_by_index(comp, 0) # Maximum uyum egitime ez
            
        # 3. C ASAMASI: Insan Dogasi Gorultusu (%10 Sapma)
        if random.random() < 0.10: # %10 olasilik
            curr_idx = get_index_by_action(comp, action_id)
            if curr_idx == 0:
                shift = 1
            elif curr_idx == len(comp_actions[comp]) - 1:
                shift = -1
            else:
                shift = random.choice([-1, 1]) # Rastgele asagi veya yukari bant
                
            action_id = get_action_by_index(comp, curr_idx + shift)
            
        # Bu yetkinlik icin secilen NIHAI aksiyonu 1 yap!
        emp_labels[action_id] = 1
        
    # Calisanin ham verisine, urettigimiz 47 etiket kolonunu kaynastir:
    out_row = row.to_dict()
    out_row.update(emp_labels)
    labeled_rows.append(out_row)

df_out = pd.DataFrame(labeled_rows)
df_out.to_csv(output_path, index=False)
print("Basariyla uretildi!")
print(f"Toplam Satir: {df_out.shape[0]}")
print(f"Toplam Sutun: {df_out.shape[1]} (30 Ham Veri + 47 ML Etiketi)")
print(f"Kaydedilen dosya: {output_path}")

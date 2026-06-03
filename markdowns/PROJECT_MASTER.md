\#\# Project Master Documentation

\---

# **1\. PROJECT OVERVIEW**

\#\# 1.1 Project Name  
\*\*AI-Supported Personalized Employee Development Recommendation System\*\*

\#\# 1.2 Main Goal  
This project aims to build an intelligent system that analyzes \*\*360-degree employee competency evaluation data\*\* and generates \*\*personalized development plans\*\* for employees.

The system will:  
\- Analyze employee competency scores  
\- Detect low or under-target competency areas  
\- Match those competency gaps with suitable development actions  
\- Learn action recommendation patterns through machine learning  
\- Generate personalized development plans automatically

\---

#  **2\. CORE PROBLEM WE ARE SOLVING**

In organizations, employees are usually evaluated using competency-based assessment systems.   
However, even if competency scores are available, organizations often struggle with the next question:

\> “What specific development actions should this employee receive?”

This project solves that problem by building a system that can answer:

\> “Given this employee’s competency profile, what development actions are most suitable?”

\---

# **3\. PROJECT OBJECTIVE (VERY IMPORTANT)**

This project is \*\*NOT\*\* primarily about:  
\- predicting future performance  
\- predicting promotion  
\- predicting attrition  
\- predicting salary

This project \*\*IS\*\* about:

\> \*\*Training a model that can recommend suitable development actions / action packages for employees based on their competency profile.\*\*

\---

\# 4\. HIGH-LEVEL SYSTEM LOGIC

The overall system works like this:

1\. Employee competency scores are given as input  
2\. Low competency areas are detected  
3\. Candidate development actions are identified  
4\. A machine learning model evaluates which actions are most suitable  
5\. The system selects the best actions  
6\. The selected actions are packaged into a development plan

\---

# **5\. WHAT WE HAVE DONE SO FAR**

So far, the following major design decisions and structures have been completed:

##  **5.1 Defined the competency structure**

We structured competencies into 3 levels:

\#\#\# A) Core Competencies  
Shared across all employees:  
\- Core\_Communication  
\- Core\_Teamwork  
\- Core\_ProblemSolving  
\- Core\_Adaptability  
\- Core\_TimeManagement  
\- Core\_Initiative  
\- Core\_Accountability  
\- Core\_LearningAgility

 B) Department-Based Competencies  
These are department-specific abstract competency columns:  
\- Dept\_Comp1  
\- Dept\_Comp2  
\- Dept\_Comp3

These are mapped to real competency meanings depending on department.

 C) Role-Based Competencies  
These are job-role-specific abstract competency columns:  
\- Role\_Comp1  
\- Role\_Comp2

These are mapped to real competency meanings depending on job role.

\---

## **5.2 Designed the abstraction logic**

Instead of creating dozens of columns like:

\- HR\_TalentManagement  
\- Tech\_SystemDesign  
\- Sales\_ClientHandling  
\- Finance\_RiskAnalysis  
\- etc.

we used \*\*abstract competency columns\*\* and stored the actual meaning in separate JSON mapping files.

This is a \*\*good design choice\*\* because:  
\- it keeps the dataset clean  
\- it avoids unnecessary column explosion  
\- it makes the system scalable

\---

#  **6\. CURRENT DATA STRUCTURE**

##  **6.1 Departments**

There are \*\*5 departments\*\*:

1\. Human Resources  
2\. Technology  
3\. Sales & Marketing  
4\. Finance & Accounting  
5\. Operations

\---

## **6.2 Job Roles**

There are \*\*24 total job roles\*\*:

Human Resources (3)  
\- HR Specialist  
\- Recruiter  
\- HR Manager

Technology (8)  
\- Software Engineer  
\- Senior Software Engineer  
\- Data Scientist  
\- Machine Learning Engineer  
\- QA Engineer  
\- DevOps Engineer  
\- Technical Support Engineer  
\- Engineering Manager

Sales & Marketing (4)  
\- Sales Executive  
\- Sales Representative  
\- Account Manager  
\- Marketing Specialist

Finance & Accounting (4)  
\- Accountant  
\- Financial Analyst  
\- Payroll Specialist  
\- Finance Manager

Operations (5)  
\- Operations Specialist  
\- Logistics Coordinator  
\- Production Engineer  
\- Field Supervisor  
\- Operations Manager

\---

# **7\. MAPPING FILE STRUCTURE**

The competency abstraction is supported by mapping JSON files.

\---

## **7.1 Department Competency Mapping Example**

\`\`\`python  
DEPT\_COMP\_MAP \= {  
 "Human Resources": {  
   "Dept\_Comp1": {  
     "key": "HR\_TalentManagement",  
     "type": "process",  
     "desc": "Yetenek yönetimi, işe alım, değerlendirme ve yerleştirme süreçleri."  
   },  
   "Dept\_Comp2": {  
     "key": "HR\_EmployeeRelations",  
     "type": "behavioral",  
     "desc": "Çalışan ilişkileri, çatışma yönetimi, iletişim ve bağlılık."  
   },  
   "Dept\_Comp3": {  
     "key": "HR\_HRCompliance",  
     "type": "process",  
     "desc": "İK mevzuatı/uyum, politika uygulama ve süreç standardizasyonu."  
   }  
 }  
}  
---

## **7.2 Role Competency Mapping Example**

ROLE\_COMP\_MAP \= {  
 "HR Specialist": \[  
   {  
     "col": "Role\_Comp1",  
     "key": "HR\_PolicyAdministration",  
     "type": "process",  
     "desc": "İK süreçleri, prosedür ve evrak yönetimi."  
   },  
   {  
     "col": "Role\_Comp2",  
     "key": "HR\_EmployeeSupport",  
     "type": "behavioral",  
     "desc": "Çalışan talepleri, destek ve çözüm odaklı iletişim."  
   }  
 \]  
}  
---

# **8\. IMPORTANT DESIGN DECISION: ACTION SYSTEM**

This project does not directly generate free-text development plans from scratch.  
Instead, it works using a structured Action Recommendation System.  
This is one of the most important parts of the project.  
---

# **9\. WHAT IS AN “ACTION”?**

An Action is a concrete development intervention that can be recommended to an employee.  
Examples:

* training module  
* workshop  
* guided practice  
* behavioral exercise  
* self-reflection task  
* coaching activity  
* project assignment  
* feedback practice  
* simulation  
* mentoring session

Each action targets one competency and is selected according to score range.  
---

# **10\. ACTION SYSTEM DESIGN**

We designed the action system in 3 layers:  
---

## **10.1 Core Actions**

These are common across all employees.

* 8 Core Competencies  
* 4 actions per competency

### **Total:**

8 × 4 \= 32 Core Actions  
---

## **10.2 Department Actions**

These are department-contextualized actions.

* 3 department competency slots  
* 3 actions per competency

### **Total abstract action IDs:**

3 × 3 \= 9 Department Actions  
Important note:

* These are not multiplied as separate action IDs per department  
* Instead, each department action has department-specific content

So:

* DEPT\_COMP1\_01 is one action ID  
* but its content changes for HR / Technology / Finance / etc.

---

## **10.3 Role Actions**

These are role-contextualized actions.

* 2 role competency slots  
* 3 actions per competency

### **Total:**

2 × 3 \= 6 Role Actions  
These are role-specific in meaning/content.  
---

# **11\. TOTAL ACTION COUNT**

Total action count is fixed as:

* Core \= 32  
* Dept \= 9  
* Role \= 6

## **Total:**

# **47 Actions**

This number should remain stable.  
We should not explode the action space unnecessarily.  
This is a very important architectural decision.  
---

# **12\. FINAL ACTION ARCHITECTURE DECISION**

We finalized the following logic:

## **Core Actions**

* Shared for everyone  
* Same content for all roles/departments

## **Department Actions**

* Same action ID  
* Content differs by department  
* No need to define separate action IDs for every role inside a department

## **Role Actions**

* Action content is role-specific  
* These remain role-sensitive

This is the correct balance between:

* simplicity  
* scalability  
* personalization

---

# **13\. ACTION JSON STRUCTURE**

Each action is represented as a structured JSON object.  
Example:  
{  
 "action\_id": "CORE\_COMM\_01",  
 "target\_competency": "Core\_Communication",  
 "action\_category": "Core",  
 "action\_type": "Behavioral Practice",  
 "difficulty": "High",  
 "estimated\_effort\_hours": 24,  
 "selection\_rules": {  
   "min\_score": 1.0,  
   "max\_score": 1.6  
 },  
 "content": {  
   "title": "Structured Communication Fundamentals",  
   "delivery\_type": "Self-guided \+ Practice",  
   "resource": "Internal communication framework guide",  
   "description": "Günlük iş akışında yazılı ve sözlü iletişimde mesaj netliği, amaç belirleme ve yapılandırılmış anlatım üzerine haftalık pratikler uygulanır."  
 }  
}  
---

# **14\. ACTION PACKAGE LOGIC**

An employee does not receive a random plan.  
Instead, the system builds the employee’s plan from selected actions.

## **Logic:**

* competency score is checked  
* corresponding action band is found  
* candidate actions are determined  
* model evaluates action suitability  
* best actions are selected  
* final plan is generated

So:  
Plan \= selected actions combined into a structured development schedule  
---

# **15\. IMPORTANT CLARIFICATION: WHAT THE MODEL DOES**

This is one of the most misunderstood parts.

## **The model does NOT do:**

* directly write full plan text from nothing  
* directly “understand psychology magically”  
* directly create random HR recommendations

## **The model DOES:**

Predict which actions are suitable for a given employee profile  
This is the core ML problem.  
---

# **16\. RULE-BASED PART VS MODEL PART**

The project has both:

* deterministic logic  
* learned logic

Both are necessary.  
---

## **16.1 Deterministic / Structured Logic**

Used for:

* competency mapping  
* score band matching  
* candidate action pool creation  
* plan formatting  
* output packaging

---

## **16.2 Machine Learning Logic**

Used for:

* learning which action combinations are most suitable  
* differentiating similar low-score cases across different employee contexts  
* producing smarter, more contextual recommendations

---

# **17\. WHY MACHINE LEARNING IS NEEDED**

Without ML, the system would only say:  
“If Communication is low, give Communication Action 2.”  
That is too simplistic.  
But in reality:

### **Example:**

Two employees may both have low communication:

#### **Employee A**

* HR Specialist  
* Communication \= 1.8  
* Role\_Comp1 \= 1.5

#### **Employee B**

* Software Engineer  
* Communication \= 1.8  
* ProblemSolving \= 1.9  
* Role\_Comp2 \= 1.7

Both have low communication, but the suitable intervention may differ.

### **Employee A may need:**

* feedback conversation practice  
* employee communication scenarios

### **Employee B may need:**

* technical written communication  
* code review communication structure

This contextual differentiation is exactly why the ML layer exists.  
---

# **18\. IMPORTANT REALITY CHECK**

The model does NOT “guess” this automatically from nowhere.  
The model can only learn these patterns if:

* the data structure is correct  
* the labels are correct  
* the action design is consistent

So the quality of the project depends heavily on:  
How well we design the action-labeling pipeline  
---

# **19\. DATASET DESIGN FOR MODEL TRAINING**

This is one of the most important technical decisions.  
We decided to use a Wide Format Multi-Label Classification setup.  
---

# **20\. MACHINE LEARNING DATASET STRUCTURE**

We need two logical parts:

## **X \= Features (inputs)**

Employee profile data

## **Y \= Labels (outputs)**

Action suitability labels  
---

# **21\. X (FEATURES) DATASET**

This dataset contains employee inputs.  
Example columns:

* employee\_id  
* department  
* role  
* Core\_Communication  
* Core\_Teamwork  
* Core\_ProblemSolving  
* Core\_Adaptability  
* Core\_TimeManagement  
* Core\_Initiative  
* Core\_Accountability  
* Core\_LearningAgility  
* Dept\_Comp1  
* Dept\_Comp2  
* Dept\_Comp3  
* Role\_Comp1  
* Role\_Comp2

Example:

| employee\_id | department | role | Core\_Communication | Core\_Teamwork | Dept\_Comp1 | Role\_Comp1 |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| 1 | Human Resources | HR Specialist | 1.8 | 3.1 | 1.7 | 2.0 |

---

# **22\. Y (LABELS) DATASET**

This dataset contains action recommendation labels.  
Each action is a separate output column.  
Example columns:

* CORE\_COMM\_01  
* CORE\_COMM\_02  
* CORE\_COMM\_03  
* CORE\_COMM\_04  
* ...  
* DEPT\_COMP1\_01  
* DEPT\_COMP1\_02  
* ...  
* ROLE\_COMP2\_03

Each value is:

* 1 \= suitable  
* 0 \= not suitable

Example:

| employee\_id | CORE\_COMM\_01 | CORE\_COMM\_02 | DEPT\_COMP1\_02 | ROLE\_COMP1\_02 |
| ----- | ----- | ----- | ----- | ----- |
| 1 | 0 | 1 | 1 | 1 |

---

# **23\. DO WE ADD 47 NEW COLUMNS TO THE MAIN CSV?**

Technically: yes, the label space has 47 outputs.  
But practically:  
We should keep features and labels as separate files/tables.  
Recommended structure:

* employees\_features.csv  
* employees\_labels.csv  
* actions\_master.json

This is cleaner and more production-friendly.  
---

# **24\. WHY 47 LABELS IS NOT A PROBLEM**

47 labels may sound big, but it is completely manageable.  
This is a standard multi-label classification problem.  
The real challenge is not the number of columns.  
The real challenge is:  
whether the labels are designed correctly  
---

# **25\. LABELING LOGIC (VERY IMPORTANT)**

This is the step where raw employee data is converted into model training targets.  
---

# **26\. HOW LABELING WORKS**

For each employee:

1. Read competency scores  
2. Check which score band each competency falls into  
3. Match the corresponding action(s)  
4. Mark those actions as suitable (1)  
5. Mark all other actions as unsuitable (0)

---

# **27\. EXAMPLE LABELING FLOW**

Example employee:  
{  
 "department": "Human Resources",  
 "role": "HR Specialist",  
 "Core\_Communication": 1.8,  
 "Core\_Teamwork": 3.4,  
 "Core\_ProblemSolving": 2.6,  
 "Dept\_Comp1": 1.7,  
 "Dept\_Comp2": 3.0,  
 "Dept\_Comp3": 2.9,  
 "Role\_Comp1": 2.1,  
 "Role\_Comp2": 3.4  
}  
---

## **Step-by-step:**

### **Core\_Communication \= 1.8**

Matches:

* CORE\_COMM\_02

### **Core\_ProblemSolving \= 2.6**

Matches:

* CORE\_PROB\_03

### **Dept\_Comp1 \= 1.7**

Matches:

* DEPT\_COMP1\_02

### **Dept\_Comp2 \= 3.0**

Matches:

* DEPT\_COMP2\_03

### **Dept\_Comp3 \= 2.9**

Matches:

* DEPT\_COMP3\_03

### **Role\_Comp1 \= 2.1**

Matches:

* ROLE\_COMP1\_02

---

## **Final labels:**

{  
 "CORE\_COMM\_02": 1,  
 "CORE\_PROB\_03": 1,  
 "DEPT\_COMP1\_02": 1,  
 "DEPT\_COMP2\_03": 1,  
 "DEPT\_COMP3\_03": 1,  
 "ROLE\_COMP1\_02": 1  
}  
Everything else \= 0  
---

# **28\. IMPORTANT LABELING RULE**

For each competency:  
Only one score-band action should be active  
Meaning:  
If Core\_Communication \= 1.8, then only one of these should be selected:

* CORE\_COMM\_01  
* CORE\_COMM\_02  
* CORE\_COMM\_03  
* CORE\_COMM\_04

Only one should become 1.  
This is because the score cannot belong to multiple score bands at the same time.  
---

# **29\. MAX POSSIBLE ACTIVE ACTIONS PER EMPLOYEE**

Because the system contains:

* 8 Core competencies  
* 3 Dept competencies  
* 2 Role competencies

And each competency can activate max 1 action,  
Then a single employee can have at most:

* 8 Core actions  
* 3 Dept actions  
* 2 Role actions

## **Total maximum:**

# **13 active actions per employee**

This is acceptable and logical.  
---

# **30\. WHY WE SHOULD NOT EXPLODE DEPT/ROLE LABELS**

We explicitly decided NOT to create labels like:

* DEPT\_HR\_COMP1\_02  
* DEPT\_TECH\_COMP1\_02  
* DEPT\_FINANCE\_COMP1\_02

That would create unnecessary label explosion.  
Instead, we use:

* DEPT\_COMP1\_02

And later, when presenting the recommendation, the system checks:

* which department this employee belongs to

Then it shows the department-specific content.  
This is the correct architecture.  
---

# **31\. MODEL TRAINING TASK**

The ML problem is:  
Given employee features, predict which of the 47 actions are suitable  
This is a:

# **Multi-Label Classification Problem**

---

# **32\. WHAT THE MODEL WILL LEARN**

The model will try to learn patterns like:

* employees in certain roles often benefit from certain actions  
* certain combinations of competency weaknesses lead to certain action preferences  
* department/role context changes recommendation suitability

---

# **33\. TRAINING PIPELINE (HIGH LEVEL)**

The training pipeline will be:

1. Load employee feature data  
2. Load action labels  
3. Merge by employee\_id  
4. Preprocess categorical variables  
5. Split into train/test  
6. Train multi-label model  
7. Evaluate performance  
8. Use trained model for recommendation inference

---

# **34\. CANDIDATE MODELS**

Recommended first models:

* Random Forest  
* XGBoost  
* LightGBM

Best practical starting point:

## **Recommended starting order:**

1. Random Forest (easy baseline)  
2. XGBoost (stronger structured-data model)

---

# **35\. WHAT IS XGBOOST?**

XGBoost is a powerful machine learning algorithm for structured/tabular data.  
It is good when:

* data is numeric/categorical  
* feature interactions matter  
* performance matters

Why it fits this project:

* your data is tabular  
* competency scores are structured  
* department/role interactions matter  
* it handles nonlinear relationships better than simple models

---

# **36\. HOW MODEL OUTPUT WILL LOOK**

When a new employee is given, the model may output something like:  
{  
 "CORE\_COMM\_01": 0.18,  
 "CORE\_COMM\_02": 0.81,  
 "CORE\_COMM\_03": 0.21,  
 "DEPT\_COMP1\_02": 0.74,  
 "ROLE\_COMP1\_02": 0.67  
}  
These are suitability scores / probabilities.  
Then the system applies selection logic.  
---

# **37\. ACTION SELECTION LOGIC AFTER MODEL OUTPUT**

The model gives scores.  
The system then decides which actions to keep.  
Possible rules:

* keep only actions above threshold (e.g. 0.50)  
* keep top-N actions  
* max 1 action per competency  
* avoid duplicate/overlapping actions  
* balance workload across plan duration

This becomes the Action Selection Layer.  
---

# **38\. PLAN GENERATION LOGIC**

After selected actions are finalized, they are turned into a development plan.  
Example:  
{  
 "duration": "6 Weeks",  
 "actions": \[  
   "CORE\_COMM\_02",  
   "DEPT\_COMP1\_02",  
   "ROLE\_COMP1\_02",  
   "CORE\_PROB\_03"  
 \]  
}  
This means:  
The plan is not predefined as a fixed package.  
Instead:  
The plan is dynamically assembled from recommended actions.  
This is a major project design decision.  
---

# **39\. CURRENT PROJECT STATUS**

At this point, the project is approximately at the following stage:

## **Completed / Mostly Completed**

* project problem definition  
* system architecture concept  
* competency structure  
* department/role abstraction logic  
* mapping file logic  
* action system architecture  
* total action design (47 actions)  
* action JSON structure design  
* score-band based action selection idea  
* label space design  
* ML framing

## **Not Yet Fully Completed**

* final action score bands  
* action JSON finalization  
* action master file merge  
* automated labeling script  
* label dataset generation  
* model training pipeline  
* model evaluation  
* inference pipeline  
* final report/demo integration

---

# **40\. WHAT MUST BE FINALIZED NEXT**

The next steps are very clear now.  
---

# **PHASE 1 — FINALIZE ACTION SYSTEM**

## **Goal**

Freeze the action recommendation universe before model training.

### **Tasks**

* finalize all 47 actions  
* check naming consistency  
* check score ranges  
* check content consistency  
* ensure no overlapping score intervals  
* ensure no gaps in score logic  
* ensure dept/role content fields are standardized

### **Deliverables**

* actions\_master.json  
* finalized score bands  
* naming standard

---

# **PHASE 2 — BUILD THE LABELING PIPELINE**

## **Goal**

Generate ML training targets from employee competency data.

### **Tasks**

* write action lookup logic  
* map employee scores to actions  
* generate 47-label output per employee  
* save labels as employees\_labels.csv

### **Deliverables**

* labeling script  
* employees\_labels.csv

---

# **PHASE 3 — BUILD TRAINING DATASET**

## **Goal**

Prepare the model-ready training data.

### **Tasks**

* clean raw employee dataset  
* handle missing values  
* encode categorical columns  
* align features and labels  
* split train/test

### **Deliverables**

* model-ready X  
* model-ready Y  
* preprocessing pipeline

---

# **PHASE 4 — TRAIN BASELINE MODELS**

## **Goal**

Train first working recommendation models.

### **Tasks**

* train baseline model  
* compare Random Forest / XGBoost  
* evaluate label prediction performance  
* inspect overfitting / underfitting

### **Deliverables**

* first trained model  
* first evaluation results

---

# **PHASE 5 — BUILD RECOMMENDATION ENGINE**

## **Goal**

Turn raw model output into usable development recommendations.

### **Tasks**

* action score ranking  
* thresholding  
* top-N selection  
* de-duplication  
* max-actions logic  
* packaging rules

### **Deliverables**

* action selection engine  
* recommendation generator

---

# **PHASE 6 — BUILD FINAL PLAN OUTPUT**

## **Goal**

Generate final user-facing development plans.

### **Tasks**

* combine selected actions  
* assign timeline  
* define plan structure  
* create readable output format

### **Deliverables**

* final development plan JSON  
* readable plan output  
* demo-ready system output

---

# **41\. RECOMMENDED PROJECT FOLDER STRUCTURE**

project/  
│  
├── data/  
│   ├── raw/  
│   │   └── employees\_raw.csv  
│   ├── processed/  
│   │   ├── employees\_features.csv  
│   │   ├── employees\_labels.csv  
│   │   └── model\_ready.csv  
│  
├── configs/  
│   ├── dept\_comp\_map.json  
│   ├── role\_comp\_map.json  
│   └── action\_config.json  
│  
├── actions/  
│   └── actions\_master.json  
│  
├── notebooks/  
│   ├── 01\_data\_exploration.ipynb  
│   ├── 02\_label\_generation.ipynb  
│   ├── 03\_model\_training.ipynb  
│   └── 04\_inference\_demo.ipynb  
│  
├── src/  
│   ├── preprocessing.py  
│   ├── labeling.py  
│   ├── train.py  
│   ├── inference.py  
│   ├── recommendation\_engine.py  
│   └── utils.py  
│  
├── outputs/  
│   ├── models/  
│   ├── predictions/  
│   └── reports/  
│  
└── PROJECT\_MASTER.md  
---

# **42\. FINAL IMPORTANT TRUTH**

This project will succeed or fail mostly based on these 3 things:

## **1\. Action system quality**

If actions are weak, repetitive, inconsistent, or badly structured, the whole system becomes meaningless.

## **2\. Label quality**

If labels are noisy or mechanically wrong, the model will learn garbage.

## **3\. Recommendation logic**

Even if the model is decent, poor post-processing can ruin the final recommendations.  
---

# **43\. FINAL CURRENT PRIORITY**

## **Immediate Priority Order:**

1. Finalize all action packages  
2. Freeze score intervals  
3. Merge all actions into one clean master file  
4. Build the label generation logic  
5. Generate labels  
6. Start model training

This is the correct next sequence.  
---

# **44\. SHORT EXECUTIVE SUMMARY**

This project is an AI-supported recommendation system that transforms employee competency data into personalized development plans.  
The system is built on:

* structured competency data  
* abstracted department/role mappings  
* a fixed action library (47 actions)  
* automated action labeling  
* multi-label machine learning  
* recommendation packaging logic

The project has already completed the conceptual architecture and action system design, and the next major milestone is converting employee competency data into labeled training data for model training.  
---

# **45\. NEXT FILES THAT SHOULD BE CREATED IMMEDIATELY**

The next essential files are:

* actions\_master.json  
* dept\_comp\_map.json  
* role\_comp\_map.json  
* employees\_features.csv  
* employees\_labels.csv  
* labeling.py

These are the project-critical files.  
---

# **END OF DOCUMENT**

\---

\# Sana dürüst yorumum:  
Bu dosya şu an sizin için \*\*altın değerinde\*\*.

Çünkü bu dosya:  
\- projeyi \*\*taşınabilir\*\* yapar  
\- yeni chate geçince \*\*context kaybını azaltır\*\*  
\- bir AI agent’a verirsen \*\*saçmalama oranını düşürür\*\*  
\- ekip içinde \*\*herkesin aynı şeyi anlamasını sağlar\*\*  
\- bitirme projesinde “biz ne yapıyoruz?” krizini bitirir

\---

\# Sana önerdiğim sonraki adım  
Şimdi bunu bırakıp dağılmayın.   
Bundan sonra sırayla şu 3 dosyayı üretin:

1\. \`PROJECT\_MASTER.md\` ✅ (bunu şimdi verdim)  
2\. \`ACTIONS\_MASTER.json\`  
3\. \`LABELING\_LOGIC.md\`

Bunlar çıkınca proje artık \*\*elle tutulur sistem\*\* olur.

\---

İstersen bir sonraki mesajda sana direkt:

\#\# \`LABELING\_LOGIC.md\`  
dosyasını da aynı şekilde hazırlayayım.

Bu dosya şu soruyu çözer:

\> “Tam olarak çalışan verisini nasıl 47 aksiyona çeviriyoruz?”  

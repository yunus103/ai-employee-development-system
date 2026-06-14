'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../../../store/useStore';
import { apiClient } from '../../../services/apiClient';
import { EmployeeDetail } from '../../../types';
import { toast } from '../../../store/useToastStore';
import { useConfirmStore } from '../../../store/useConfirmStore';
import {
  Search,
  Filter,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Play,
  ExternalLink,
  Plus,
  X,
  UserPlus,
  UserCheck,
  Briefcase,
  GraduationCap,
  Smile
} from 'lucide-react';

export default function EmployeesPage() {
  const router = useRouter();
  const { user } = useStore();
  const [employees, setEmployees] = useState<EmployeeDetail[]>([]);
  const [allEmployeesList, setAllEmployeesList] = useState<EmployeeDetail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [managerDept, setManagerDept] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Form Drawer State
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<'basic' | 'job' | 'edu' | 'satis'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Department & Job Role Data Mappings
  const uiDepartments = [
    { name: 'Technology', label: 'Teknoloji', mockId: 2, realId: 1 },
    { name: 'Human Resources', label: 'İnsan Kaynakları', mockId: 1, realId: 2 },
    { name: 'Sales & Marketing', label: 'Satış & Pazarlama', mockId: 3, realId: 3 },
    { name: 'Finance & Accounting', label: 'Finans & Muhasebe', mockId: 4, realId: 4 },
    { name: 'Operations', label: 'Operasyon', mockId: 5, realId: 5 }
  ];

  const uiJobRoles = [
    // Technology
    { name: 'Software Engineer', label: 'Yazılım Mühendisi', dept: 'Technology', mockId: 4, realId: 1 },
    { name: 'Senior Software Engineer', label: 'Kıdemli Yazılım Mühendisi', dept: 'Technology', mockId: 5, realId: 2 },
    { name: 'Data Scientist', label: 'Veri Bilimci', dept: 'Technology', mockId: 6, realId: 3 },
    { name: 'Machine Learning Engineer', label: 'Yapay Zeka Mühendisi', dept: 'Technology', mockId: 7, realId: 3 },
    { name: 'QA Engineer', label: 'Test Mühendisi', dept: 'Technology', mockId: 8, realId: 1 },
    { name: 'DevOps Engineer', label: 'DevOps Mühendisi', dept: 'Technology', mockId: 9, realId: 1 },
    { name: 'Technical Support Engineer', label: 'Teknik Destek Mühendisi', dept: 'Technology', mockId: 10, realId: 1 },
    { name: 'Engineering Manager', label: 'Mühendislik Yöneticisi', dept: 'Technology', mockId: 11, realId: 1 },
    
    // Human Resources
    { name: 'HR Specialist', label: 'İK Uzmanı', dept: 'Human Resources', mockId: 1, realId: 2 },
    { name: 'Recruiter', label: 'İşe Alım Uzmanı', dept: 'Human Resources', mockId: 2, realId: 2 },
    { name: 'HR Manager', label: 'İK Yöneticisi', dept: 'Human Resources', mockId: 3, realId: 3 },
    
    // Sales & Marketing
    { name: 'Sales Executive', label: 'Satış Yöneticisi', dept: 'Sales & Marketing', mockId: 12, realId: 4 },
    { name: 'Sales Representative', label: 'Satış Temsilcisi', dept: 'Sales & Marketing', mockId: 13, realId: 4 },
    { name: 'Account Manager', label: 'Müşteri Yöneticisi', dept: 'Sales & Marketing', mockId: 14, realId: 4 },
    { name: 'Marketing Specialist', label: 'Pazarlama Uzmanı', dept: 'Sales & Marketing', mockId: 15, realId: 4 },
    
    // Finance & Accounting
    { name: 'Accountant', label: 'Muhasebeci', dept: 'Finance & Accounting', mockId: 16, realId: 1 },
    { name: 'Financial Analyst', label: 'Finansal Analist', dept: 'Finance & Accounting', mockId: 17, realId: 1 },
    { name: 'Payroll Specialist', label: 'Bordro Uzmanı', dept: 'Finance & Accounting', mockId: 18, realId: 1 },
    { name: 'Finance Manager', label: 'Finans Yöneticisi', dept: 'Finance & Accounting', mockId: 19, realId: 1 },
    
    // Operations
    { name: 'Operations Specialist', label: 'Operasyon Uzmanı', dept: 'Operations', mockId: 20, realId: 1 },
    { name: 'Logistics Coordinator', label: 'Lojistik Koordinatörü', dept: 'Operations', mockId: 21, realId: 1 },
    { name: 'Production Engineer', label: 'Üretim Mühendisi', dept: 'Operations', mockId: 22, realId: 1 },
    { name: 'Field Supervisor', label: 'Saha Sorumlusu', dept: 'Operations', mockId: 23, realId: 1 },
    { name: 'Operations Manager', label: 'Operasyon Yöneticisi', dept: 'Operations', mockId: 24, realId: 1 }
  ];

  // Employee Form Fields
  const [selectedDeptName, setSelectedDeptName] = useState('Technology');
  const [selectedRoleName, setSelectedRoleName] = useState('Software Engineer');
  
  const [formFields, setFormFields] = useState({
    employeeCode: '',
    fullName: '',
    email: '',
    age: 30,
    gender: 'Male' as 'Male' | 'Female',
    managerId: '' as string | number,
    education: '3',
    educationField: 'Computer Science',
    businessTravel: 'Travel_Rarely',
    maritalStatus: 'Single',
    distanceFromHome: 5,
    environmentSatisfaction: 3,
    jobSatisfaction: 3,
    workLifeBalance: 3,
    totalWorkingYears: 5,
    yearsAtCompany: 2,
    yearsInCurrentRole: 1,
    yearsWithCurrManager: 1,
    performanceScore: 3.0,
    attrition: 'No' as 'Yes' | 'No'
  });

  // Filter roles based on selected department
  const filteredRoles = uiJobRoles.filter(r => r.dept === selectedDeptName);

  // Auto-adjust is handled directly in the select dropdown's onChange handler

  // Redirect standard employees and set title
  useEffect(() => {
    document.title = 'Çalışan Listesi — 360° AI Gelişim';
    if (user && user.role === 'Employee') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Load manager's department profile on mount to enforce visibility restriction
  useEffect(() => {
    if (user && user.role === 'Manager' && user.employeeId !== null) {
      apiClient.employees.get(user.employeeId)
        .then((res) => {
          if (res.success && res.data) {
            setManagerDept(res.data.department);
          }
        })
        .catch((err: any) => {
          console.warn('Could not fetch manager profile details:', err.message || err);
        });
    }
  }, [user]);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      // Fetch all employees in a single batch to allow correct client-side filtering and pagination
      const res = await apiClient.employees.list(1, 100);
      if (res.success) {
        let filtered = res.data;
        
        // Authorization filter for Manager (cannot see other departments or admins)
        if (user?.role === 'Manager') {
          if (managerDept) {
            filtered = filtered.filter((e) => e.department === managerDept && e.email !== 'admin@demo.com');
          } else if (apiClient.isMock) {
            filtered = []; // Return empty until manager profile loads to prevent leakage in mock mode
          }
          // In real mode, if managerDept failed to load, we don't clear the list to support API fallback.
        }

        if (searchTerm) {
          filtered = filtered.filter((e) =>
            e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        if (selectedDept) {
          filtered = filtered.filter((e) => e.department === selectedDept);
        }

        const count = filtered.length;
        setTotalCount(count);
        
        const pages = Math.ceil(count / pageSize);
        setTotalPages(pages);

        // Adjust active page if it exceeds the max page limit after filtering
        let activePage = page;
        const maxPage = Math.max(pages, 1);
        if (page > maxPage) {
          activePage = maxPage;
          setPage(maxPage);
        }

        // Slice filtered results for the active page
        const startIndex = (activePage - 1) * pageSize;
        const paginated = filtered.slice(startIndex, startIndex + pageSize);

        setEmployees(paginated);
      }
    } catch (err: any) {
      console.warn('Error fetching employees list:', err.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  // Lookup list fetching is inlined inside useEffect and handleSubmit

  useEffect(() => {
    if (!user || user.role === 'Employee') return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchEmployees();
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm, selectedDept, managerDept, user]);

  useEffect(() => {
    if (!user || user.role === 'Employee') return;
    let active = true;
    apiClient.employees.list(1, 100)
      .then((res) => {
        if (active && res.success) {
          setAllEmployeesList(res.data);
        }
      })
      .catch((err: any) => {
        console.warn('Could not load manager lookup list:', err.message || err);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const handleStartAssessment = async (empId: number) => {
    useConfirmStore.getState().showConfirm({
      title: 'Değerlendirme Başlat',
      message: 'Bu çalışan için yeni bir 360° yetkinlik değerlendirmesi başlatmak istiyor musunuz?',
      confirmLabel: 'Başlat',
      cancelLabel: 'İptal',
      onConfirm: async () => {
        try {
          const res = await apiClient.assessments.create(empId, 1); // default cycleId = 1
          if (res.success && res.data) {
            toast.success('Değerlendirme başarıyla oluşturuldu. Şimdi puanları girmek için yönlendirileceksiniz.');
            router.push(`/dashboard/employee/${empId}`);
          } else {
            toast.error(res.message || 'Değerlendirme başlatılamadı.');
          }
        } catch (err: any) {
          console.warn('Error creating assessment:', err.message || err);
          const axiosError = err as {
            message?: string;
            response?: {
              status?: number;
              data?: {
                message?: string;
              };
            };
          };
          const statusCode = axiosError.response?.status;
          let errMsg = axiosError.response?.data?.message;

          if (!errMsg) {
            if (statusCode === 500) {
              errMsg = 'Sunucu hatası oluştu (500). Lütfen veritabanı veya sunucu durumunu kontrol edin.';
            } else if (statusCode === 403) {
              errMsg = 'Değerlendirme başlatmak için yetkiniz bulunmuyor (403).';
            } else if (statusCode === 404) {
              errMsg = 'Belirtilen çalışan veya değerlendirme dönemi bulunamadı (404).';
            } else if (statusCode === 401) {
              errMsg = 'Oturum süreniz doldu, lütfen tekrar giriş yapın (401).';
            } else {
              errMsg = axiosError.message || 'İşlem sırasında beklenmedik bir hata oluştu.';
            }
          }
          toast.error(errMsg);
        }
      }
    });
  };

  const handleInputChange = (field: string, val: string | number) => {
    setFormFields(prev => ({ ...prev, [field]: val }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorList([]);

    // Basic validation
    if (!formFields.fullName.trim()) {
      toast.error('Ad Soyad alanı boş bırakılamaz.');
      return;
    }
    if (!formFields.email.trim()) {
      toast.error('E-posta alanı boş bırakılamaz.');
      return;
    }

    setIsSubmitting(true);

    // Dynamic ID resolution based on mock setting
    const deptInfo = uiDepartments.find(d => d.name === selectedDeptName);
    const roleInfo = uiJobRoles.find(r => r.name === selectedRoleName);
    
    const departmentId = apiClient.isMock ? deptInfo?.mockId || 2 : deptInfo?.realId || 1;
    const jobRoleId = apiClient.isMock ? roleInfo?.mockId || 4 : roleInfo?.realId || 1;

    const payload = {
      ...formFields,
      department: selectedDeptName,
      jobRole: selectedRoleName,
      departmentId,
      jobRoleId,
      managerId: formFields.managerId === '' ? null : Number(formFields.managerId),
      isActive: true
    };

    try {
      const res = await apiClient.employees.create(payload);
      if (res.success) {
        toast.success('Yeni çalışan başarıyla kaydedildi.');
        setIsAddDrawerOpen(false);
        // Reset form
        setFormFields({
          employeeCode: '',
          fullName: '',
          email: '',
          age: 30,
          gender: 'Male',
          managerId: '',
          education: '3',
          educationField: 'Computer Science',
          businessTravel: 'Travel_Rarely',
          maritalStatus: 'Single',
          distanceFromHome: 5,
          environmentSatisfaction: 3,
          jobSatisfaction: 3,
          workLifeBalance: 3,
          totalWorkingYears: 5,
          yearsAtCompany: 2,
          yearsInCurrentRole: 1,
          yearsWithCurrManager: 1,
          performanceScore: 3.0,
          attrition: 'No'
        });
        fetchEmployees();
        apiClient.employees.list(1, 100)
          .then((res) => {
            if (res.success) {
              setAllEmployeesList(res.data);
            }
          })
          .catch((err: any) => console.warn('Could not reload manager lookup list:', err.message || err));
      } else {
        toast.error(res.message || 'Çalışan oluşturulamadı.');
      }
    } catch (err: any) {
      console.warn('Error creating employee:', err.message || err);
      const axiosError = err as { response?: { data?: { errors?: string[]; message?: string } } };
      const errors = axiosError.response?.data?.errors || [];
      if (errors.length > 0) {
        setErrorList(errors);
        toast.error('Doğrulama hatası oluştu. Lütfen form alanlarını kontrol edin.');
      } else {
        toast.error(axiosError.response?.data?.message || 'İşlem başarısız oldu.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const [errorList, setErrorList] = useState<string[]>([]);

  const departments = [
    'Human Resources',
    'Technology',
    'Sales & Marketing',
    'Finance & Accounting',
    'Operations'
  ];

  const visibleDepartments = departments.filter(dept => {
    if (user?.role === 'Manager') {
      return managerDept ? dept === managerDept : false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn relative">
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slideInRight {
          animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-foreground">Çalışan Listesi</h3>
          <p className="text-xs text-muted mt-0.5">Yetkinliklerini analiz etmek istediğiniz çalışanı seçin veya değerlendirme başlatın.</p>
        </div>
        {user?.role === 'Admin' && (
          <button
            onClick={() => setIsAddDrawerOpen(true)}
            className="flex items-center space-x-1.5 rounded-xl bg-primary hover:bg-primary-hover px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-primary/10 transition duration-150"
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Çalışan Ekle</span>
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="İsim veya çalışan kodu ile ara..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl bg-card border border-card-border py-3 pr-4 pl-12 text-sm text-foreground placeholder-muted outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Department Filter dropdown */}
        <div className="relative w-full md:w-64">
          <Filter className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted" />
          <select
            value={user?.role === 'Manager' ? managerDept || '' : selectedDept}
            disabled={user?.role === 'Manager'}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl bg-card border border-card-border py-3 pr-4 pl-12 text-sm text-foreground placeholder-muted outline-none appearance-none cursor-pointer focus:border-primary disabled:opacity-80 disabled:cursor-not-allowed"
          >
            {user?.role !== 'Manager' && <option value="">Tüm Departmanlar</option>}
            {visibleDepartments.map((dept) => (
              <option key={dept} value={dept}>
                {dept === 'Human Resources' ? 'İnsan Kaynakları' :
                 dept === 'Technology' ? 'Teknoloji' :
                 dept === 'Sales & Marketing' ? 'Satış & Pazarlama' :
                 dept === 'Finance & Accounting' ? 'Finans & Muhasebe' : 'Operasyon'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="glass-panel rounded-2xl border border-card-border overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4 animate-pulse">
            <div className="h-10 bg-card-border/30 rounded-xl w-full"></div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex space-x-4">
                <div className="h-12 bg-card-border/25 rounded-xl flex-1"></div>
                <div className="h-12 bg-card-border/25 rounded-xl w-24"></div>
                <div className="h-12 bg-card-border/25 rounded-xl w-32"></div>
                <div className="h-12 bg-card-border/25 rounded-xl w-20"></div>
              </div>
            ))}
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-20 text-sm text-muted">
            Aradığınız kriterlere uygun çalışan bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-card-border bg-card/30 text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="py-4.5 px-6">Kod</th>
                  <th className="py-4.5 px-6">Ad Soyad</th>
                  <th className="py-4.5 px-6">Pozisyon</th>
                  <th className="py-4.5 px-6">Departman</th>
                  <th className="py-4.5 px-6">Skor</th>
                  <th className="py-4.5 px-6 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-card/20 transition">
                    <td className="py-4 px-6 text-sm font-semibold text-primary">{emp.employeeCode}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                          {emp.fullName[0]}
                        </div>
                        <span className="text-sm font-semibold text-foreground">{emp.fullName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-muted">{emp.jobRole}</td>
                    <td className="py-4 px-6 text-sm text-muted">{emp.department}</td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center space-x-1 font-bold text-sm text-success">
                        <TrendingUp className="h-4 w-4 shrink-0" />
                        <span>{emp.performanceScore !== undefined && emp.performanceScore !== null ? emp.performanceScore : '-'}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      {/* Only HR/Manager can start evaluation */}
                      {(user?.role === 'HR' || user?.role === 'Manager') && (
                        <button
                          onClick={() => handleStartAssessment(emp.id)}
                          className="inline-flex items-center space-x-1.5 rounded-lg border border-warning/20 bg-warning/5 hover:bg-warning/10 py-1.5 px-3 text-xs font-bold text-warning transition duration-150"
                        >
                          <Play className="h-3 w-3 shrink-0" />
                          <span>360 Başlat</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => router.push(`/dashboard/employee/${emp.id}`)}
                        className="inline-flex items-center space-x-1.5 rounded-lg bg-primary hover:bg-primary-hover py-1.5 px-3 text-xs font-bold text-white shadow-sm shadow-primary/10 transition duration-150"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span>Analiz ve Plan</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted">
            Toplam {totalCount} çalışandan {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} arası gösteriliyor.
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-card-border text-muted hover:text-foreground disabled:opacity-50 transition duration-150"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold px-3 text-foreground">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-card-border text-muted hover:text-foreground disabled:opacity-50 transition duration-150"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sliding Drawer for Adding Employee */}
      {isAddDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay */}
          <div
            onClick={() => setIsAddDrawerOpen(false)}
            className="absolute inset-0 bg-background/60 backdrop-blur-sm transition-opacity"
          ></div>

          {/* Panel content */}
          <div className="relative z-10 w-full max-w-xl h-full bg-card border-l border-card-border shadow-2xl flex flex-col justify-between animate-slideInRight overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-card-border flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">Yeni Çalışan Kaydet</h4>
                  <p className="text-[10px] text-muted">Sistem veritabanına yeni çalışan profili ekler.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddDrawerOpen(false)}
                className="rounded-lg p-2 text-muted hover:bg-card-border transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs Selector */}
            <div className="px-6 border-b border-card-border flex items-center space-x-4 bg-card/50">
              <button
                onClick={() => setActiveFormTab('basic')}
                className={`py-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition ${
                  activeFormTab === 'basic' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Kişisel Bilgiler</span>
              </button>
              <button
                onClick={() => setActiveFormTab('job')}
                className={`py-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition ${
                  activeFormTab === 'job' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span>Pozisyon & Görev</span>
              </button>
              <button
                onClick={() => setActiveFormTab('edu')}
                className={`py-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition ${
                  activeFormTab === 'edu' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'
                }`}
              >
                <GraduationCap className="h-3.5 w-3.5" />
                <span>Eğitim & Performans</span>
              </button>
              <button
                onClick={() => setActiveFormTab('satis')}
                className={`py-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition ${
                  activeFormTab === 'satis' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'
                }`}
              >
                <Smile className="h-3.5 w-3.5" />
                <span>Memnuniyet & Süre</span>
              </button>
            </div>

            {/* Form Fields Wrapper */}
            <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Validation Errors Alert */}
                {errorList.length > 0 && (
                  <div className="rounded-xl bg-danger/10 border border-danger/20 p-4 text-xs text-danger space-y-1">
                    <p className="font-bold">Hataları düzeltin:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {errorList.map((err, idx) => <li key={idx}>{err}</li>)}
                    </ul>
                  </div>
                )}

                {/* TAB 1: BASIC INFO */}
                {activeFormTab === 'basic' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Ad Soyad *</label>
                        <input
                          type="text"
                          required
                          value={formFields.fullName}
                          onChange={(e) => handleInputChange('fullName', e.target.value)}
                          placeholder="Örn: Ali Demir"
                          className="w-full rounded-xl bg-card/50 border border-card-border p-3 text-xs text-foreground placeholder-muted outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">E-posta Adresi *</label>
                        <input
                          type="email"
                          required
                          value={formFields.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="ali.demir@demo.com"
                          className="w-full rounded-xl bg-card/50 border border-card-border p-3 text-xs text-foreground placeholder-muted outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Çalışan Kodu</label>
                        <input
                          type="text"
                          value={formFields.employeeCode}
                          onChange={(e) => handleInputChange('employeeCode', e.target.value)}
                          placeholder="Boş bırakılırsa oto-üretilir"
                          className="w-full rounded-xl bg-card/50 border border-card-border p-3 text-xs text-foreground placeholder-muted outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Yaş *</label>
                        <input
                          type="number"
                          required
                          min={18}
                          max={70}
                          value={formFields.age}
                          onChange={(e) => handleInputChange('age', Number(e.target.value))}
                          className="w-full rounded-xl bg-card/50 border border-card-border p-3 text-xs text-foreground outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Cinsiyet</label>
                        <select
                          value={formFields.gender}
                          onChange={(e) => handleInputChange('gender', e.target.value)}
                          className="w-full rounded-xl bg-card/50 border border-card-border p-3 text-xs text-foreground outline-none focus:border-primary"
                        >
                          <option value="Male">Erkek</option>
                          <option value="Female">Kadın</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Medeni Durum</label>
                        <select
                          value={formFields.maritalStatus}
                          onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                          className="w-full rounded-xl bg-card/50 border border-card-border p-3 text-xs text-foreground outline-none focus:border-primary"
                        >
                          <option value="Single">Bekar</option>
                          <option value="Married">Evli</option>
                          <option value="Divorced">Boşanmış</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: JOB INFO */}
                {activeFormTab === 'job' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Departman</label>
                        <select
                          value={selectedDeptName}
                          onChange={(e) => {
                            const newDept = e.target.value;
                            setSelectedDeptName(newDept);
                            const rolesForDept = uiJobRoles.filter(r => r.dept === newDept);
                            if (rolesForDept.length > 0) {
                              setSelectedRoleName(rolesForDept[0].name);
                            }
                          }}
                          className="w-full rounded-xl bg-card/50 border border-card-border p-3 text-xs text-foreground outline-none focus:border-primary"
                        >
                          {uiDepartments.map(d => (
                            <option key={d.name} value={d.name}>{d.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Rol / Pozisyon</label>
                        <select
                          value={selectedRoleName}
                          onChange={(e) => setSelectedRoleName(e.target.value)}
                          className="w-full rounded-xl bg-card/50 border border-card-border p-3 text-xs text-foreground outline-none focus:border-primary"
                        >
                          {filteredRoles.map(r => (
                            <option key={r.name} value={r.name}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Yönetici</label>
                        <select
                          value={formFields.managerId}
                          onChange={(e) => handleInputChange('managerId', e.target.value)}
                          className="w-full rounded-xl bg-card/50 border border-card-border p-3 text-xs text-foreground outline-none focus:border-primary"
                        >
                          <option value="">Yöneticisi Yok</option>
                          {allEmployeesList.map(e => (
                            <option key={e.id} value={e.id}>{e.fullName} ({e.jobRole})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Seyahat Sıklığı</label>
                        <select
                          value={formFields.businessTravel}
                          onChange={(e) => handleInputChange('businessTravel', e.target.value)}
                          className="w-full rounded-xl bg-card/50 border border-card-border p-3 text-xs text-foreground outline-none focus:border-primary"
                        >
                          <option value="Travel_Rarely">Seyahat Etmiyor / Nadiren</option>
                          <option value="Travel_Frequently">Sık Sık Seyahat Ediyor</option>
                          <option value="Non-Travel">Seyahat Yok</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Evden Uzaklık (km)</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={formFields.distanceFromHome}
                        onChange={(e) => handleInputChange('distanceFromHome', Number(e.target.value))}
                        className="w-full rounded-xl bg-card/50 border border-card-border p-3 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 3: EDUCATION & PERFORMANCE */}
                {activeFormTab === 'edu' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Eğitim Seviyesi</label>
                        <select
                          value={formFields.education}
                          onChange={(e) => handleInputChange('education', e.target.value)}
                          className="w-full rounded-xl bg-card/50 border border-card-border p-3 text-xs text-foreground outline-none focus:border-primary"
                        >
                          <option value="1">Lise / Ön Lisans</option>
                          <option value="2">Lisans</option>
                          <option value="3">Yüksek Lisans</option>
                          <option value="4">Doktora</option>
                          <option value="5">İleri Düzey Doktora / Post-Doc</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Eğitim Alanı</label>
                        <select
                          value={formFields.educationField}
                          onChange={(e) => handleInputChange('educationField', e.target.value)}
                          className="w-full rounded-xl bg-card/50 border border-card-border p-3 text-xs text-foreground outline-none focus:border-primary"
                        >
                          <option value="Life Sciences">Yaşam Bilimleri (Life Sciences)</option>
                          <option value="Medical">Tıp/Sağlık (Medical)</option>
                          <option value="Marketing">Pazarlama (Marketing)</option>
                          <option value="Technical Degree">Teknik Derece (Technical Degree)</option>
                          <option value="Human Resources">İnsan Kaynakları (Human Resources)</option>
                          <option value="Computer Science">Bilgisayar Bilimleri (Computer Science)</option>
                          <option value="Other">Diğer (Other)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[10px] font-bold text-muted uppercase">Son Dönem Performans Skoru</label>
                        <span className="text-xs font-bold text-primary">{formFields.performanceScore.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-[10px] text-muted">1.0</span>
                        <input
                          type="range"
                          min="1.0"
                          max="5.0"
                          step="0.1"
                          value={formFields.performanceScore}
                          onChange={(e) => handleInputChange('performanceScore', parseFloat(e.target.value))}
                          className="w-full h-5 bg-transparent appearance-none cursor-pointer"
                        />
                        <span className="text-[10px] text-muted">5.0</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Ayrılma Durumu / Riski (Attrition)</label>
                      <select
                        value={formFields.attrition}
                        onChange={(e) => handleInputChange('attrition', e.target.value)}
                        className="w-full rounded-xl bg-card/50 border border-card-border p-3 text-xs text-foreground outline-none focus:border-primary"
                      >
                        <option value="No">Hayır (Düşük Risk)</option>
                        <option value="Yes">Evet (Yüksek Risk)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* TAB 4: SATISFACTION & EXPERIENCE */}
                {activeFormTab === 'satis' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Ortam Memnuniyeti</label>
                        <select
                          value={formFields.environmentSatisfaction}
                          onChange={(e) => handleInputChange('environmentSatisfaction', Number(e.target.value))}
                          className="w-full rounded-xl bg-card/50 border border-card-border p-2.5 text-xs text-foreground outline-none"
                        >
                          <option value="1">1 (Çok Zayıf)</option>
                          <option value="2">2 (Zayıf)</option>
                          <option value="3">3 (İyi)</option>
                          <option value="4">4 (Çok İyi)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">İş Memnuniyeti</label>
                        <select
                          value={formFields.jobSatisfaction}
                          onChange={(e) => handleInputChange('jobSatisfaction', Number(e.target.value))}
                          className="w-full rounded-xl bg-card/50 border border-card-border p-2.5 text-xs text-foreground outline-none"
                        >
                          <option value="1">1 (Çok Zayıf)</option>
                          <option value="2">2 (Zayıf)</option>
                          <option value="3">3 (İyi)</option>
                          <option value="4">4 (Çok İyi)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Yaşam Dengesi</label>
                        <select
                          value={formFields.workLifeBalance}
                          onChange={(e) => handleInputChange('workLifeBalance', Number(e.target.value))}
                          className="w-full rounded-xl bg-card/50 border border-card-border p-2.5 text-xs text-foreground outline-none"
                        >
                          <option value="1">1 (Çok Zayıf)</option>
                          <option value="2">2 (Zayıf)</option>
                          <option value="3">3 (İyi)</option>
                          <option value="4">4 (Çok İyi)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Toplam Çalışma Süresi (Yıl)</label>
                        <input
                          type="number"
                          min={0}
                          value={formFields.totalWorkingYears}
                          onChange={(e) => handleInputChange('totalWorkingYears', Number(e.target.value))}
                          className="w-full rounded-xl bg-card/50 border border-card-border p-3 text-xs text-foreground outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Şirketteki Yılı</label>
                        <input
                          type="number"
                          min={0}
                          value={formFields.yearsAtCompany}
                          onChange={(e) => handleInputChange('yearsAtCompany', Number(e.target.value))}
                          className="w-full rounded-xl bg-card/50 border border-card-border p-3 text-xs text-foreground outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Mevcut Pozisyon Süresi (Yıl)</label>
                        <input
                          type="number"
                          min={0}
                          value={formFields.yearsInCurrentRole}
                          onChange={(e) => handleInputChange('yearsInCurrentRole', Number(e.target.value))}
                          className="w-full rounded-xl bg-card/50 border border-card-border p-3 text-xs text-foreground outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Mevcut Yöneticiyle Süre (Yıl)</label>
                        <input
                          type="number"
                          min={0}
                          value={formFields.yearsWithCurrManager}
                          onChange={(e) => handleInputChange('yearsWithCurrManager', Number(e.target.value))}
                          className="w-full rounded-xl bg-card/50 border border-card-border p-3 text-xs text-foreground outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Drawer Footer actions */}
              <div className="p-6 border-t border-card-border bg-card/50 flex items-center justify-between space-x-4">
                <button
                  type="button"
                  onClick={() => setIsAddDrawerOpen(false)}
                  className="w-1/3 rounded-xl border border-card-border hover:bg-card-border py-3 text-xs font-bold text-muted hover:text-foreground transition"
                >
                  İptal
                </button>
                {activeFormTab !== 'satis' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeFormTab === 'basic') setActiveFormTab('job');
                      else if (activeFormTab === 'job') setActiveFormTab('edu');
                      else if (activeFormTab === 'edu') setActiveFormTab('satis');
                    }}
                    className="w-2/3 rounded-xl bg-primary hover:bg-primary-hover py-3 text-xs font-bold text-white transition flex items-center justify-center space-x-1.5"
                  >
                    <span>Sonraki Adım</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-2/3 rounded-xl bg-success hover:bg-success-hover py-3 text-xs font-bold text-white transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>Kaydı Tamamla</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

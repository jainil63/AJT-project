import {
    Activity,
    Calendar,
    Database,
    IndianRupee,
    Stethoscope,
    Users,
    UserSquare
} from 'lucide-react';

export const modulesData = [
    {
        id: 1,
        title: "Patient Master",
        icon: Users,
        color: "bg-emerald-500",
        bgLight: "bg-emerald-50 text-emerald-600",
        isFrequent: true,
        subModules: [
            "Patient Registration"
        ]
    },
    {
        id: 2,
        title: "Appointment Management",
        icon: Calendar,
        color: "bg-purple-500",
        bgLight: "bg-purple-50 text-purple-600",
        isFrequent: true,
        subModules: [
            "Appointment Booking", "Doctor Calendar"
        ]
    },
    {
        id: 3,
        title: "Treatment Records",
        icon: Stethoscope,
        color: "bg-rose-500",
        bgLight: "bg-rose-50 text-rose-600",
        isFrequent: true,
        subModules: [
            "Visit", "Visit Status", "Treatments"
        ]
    },
    {
        id: 4,
        title: "Billing & Payments",
        icon: IndianRupee,
        color: "bg-teal-500",
        bgLight: "bg-teal-50 text-teal-600",
        isFrequent: true,
        subModules: [
            "Transactions", "Payment Mode", "Consultant Charge"
        ]
    },
    {
        id: 5,
        title: "Staff Management",
        icon: UserSquare,
        color: "bg-fuchsia-500",
        bgLight: "bg-fuchsia-50 text-fuchsia-600",
        subModules: [
            "Employee Master", "Designation Master"
        ]
    },
    {
        id: 6,
        title: "Reports",
        icon: Activity,
        color: "bg-violet-500",
        bgLight: "bg-violet-50 text-violet-600",
        subModules: [
            "Clinic Report"
        ]
    },
    {
        id: 7,
        title: "Master Management",
        icon: Database,
        color: "bg-slate-500",
        bgLight: "bg-slate-50 text-slate-600",
        subModules: [
            "Doctor Master", "Specialty", "Medical Alert", "Document Type"
        ]
    }
];

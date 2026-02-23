
import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Button, Card } from './Common';

interface ProfileSettingsProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user, onUpdateUser }) => {
  const [formData, setFormData] = useState<Partial<User>>({ ...user });
  const [password, setPassword] = useState(user.password || '');
  const [slackWebhook, setSlackWebhook] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing webhook from local storage on mount
  useEffect(() => {
    const storedWebhook = localStorage.getItem('dqa_slack_webhook');
    if (storedWebhook) setSlackWebhook(storedWebhook);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    // Mimic async save
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Save User Data
    onUpdateUser({ ...user, ...formData, password } as User);
    
    // Save Integration Settings
    if (slackWebhook.trim()) {
        localStorage.setItem('dqa_slack_webhook', slackWebhook.trim());
    } else {
        localStorage.removeItem('dqa_slack_webhook');
    }

    setIsSaving(false);
    alert("Profile and settings updated successfully!");
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic size check (2MB)
      if (file.size > 2 * 1024 * 1024) {
          alert("Image size too large. Please upload an image under 2MB.");
          return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, avatar: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-fadeIn">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-2xl font-bold text-slate-900">My Profile</h2>
        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider">
            {user.role} Account
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Avatar */}
        <Card className="p-8 flex flex-col items-center text-center h-fit border-t-4 border-t-blue-500">
            <div className="relative w-32 h-32 mb-6 group">
                {formData.avatar ? (
                    <img src={formData.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg" />
                ) : (
                    <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-4xl text-slate-400 font-bold border-4 border-white shadow-lg">
                        {formData.name?.charAt(0)}
                    </div>
                )}
                <div 
                    className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]" 
                    onClick={() => fileInputRef.current?.click()}
                >
                    <span className="text-white text-xs font-bold uppercase tracking-widest border border-white/50 px-2 py-1 rounded">Change</span>
                </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
            
            <h3 className="font-bold text-slate-800 text-lg mb-1">{formData.name}</h3>
            <p className="text-slate-400 text-xs mb-6 truncate max-w-[200px]">{formData.email}</p>
            
            <Button variant="secondary" className="w-full text-xs" onClick={() => fileInputRef.current?.click()}>
                <svg className="w-4 h-4 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Upload New Picture
            </Button>
            <p className="text-[10px] text-slate-400 mt-2">Recommended: Square JPG/PNG, max 2MB</p>
        </Card>

        {/* Right Column - Details */}
        <div className="md:col-span-2 space-y-6">
            <Card className="p-8">
                <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    <h3 className="text-lg font-bold text-slate-800">Personal Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Full Name</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Your full name"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Email Address</label>
                        <input 
                            type="email" 
                            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                            value={formData.email || ''}
                            disabled
                            title="Contact your manager to change email address"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Phone Number</label>
                        <input 
                            type="tel" 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={formData.phone || ''}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+1 (555) 000-0000"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Country / Region</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={formData.country || ''}
                            onChange={e => setFormData({ ...formData, country: e.target.value })}
                            placeholder="e.g. United States"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Mailing Address</label>
                        <textarea 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none transition-all"
                            value={formData.address || ''}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Street address, Apt, City, Zip"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100 mt-8">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    <h3 className="text-lg font-bold text-slate-800">Security</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Change Password</label>
                        <input 
                            type="password" 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Enter new password to change"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Leave as is to keep current password.</p>
                    </div>
                </div>
            </Card>

            {/* INTEGRATIONS CARD - Only for Managers */}
            {user.role === UserRole.MANAGER && (
                <Card className="p-8">
                     <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <h3 className="text-lg font-bold text-slate-800">Integrations</h3>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-2">
                             {/* Simple Slack Icon Placeholder */}
                             <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.522 2.521 2.527 2.527 0 0 1-2.522-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.522 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.522 2.521A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.52h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.522 2.527 2.527 0 0 1 2.52-2.52V6.313A2.527 2.527 0 0 1 17.688 3.793a2.528 2.528 0 0 1 2.522 2.52v11.375z"/></svg>
                             Slack Webhook URL
                        </label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-slate-600"
                            value={slackWebhook}
                            onChange={e => setSlackWebhook(e.target.value)}
                            placeholder="https://hooks.slack.com/services/..."
                        />
                        <p className="text-[10px] text-slate-400 mt-2">
                            Enter your Slack Incoming Webhook URL to receive notifications about escalations and high priority task completions.
                        </p>
                    </div>
                </Card>
            )}

            <div className="flex justify-end pt-4">
                <Button onClick={handleSave} className="px-8 shadow-lg shadow-blue-500/30" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;

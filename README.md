# HR Module (Phase 1 + 2)

Next.js 15 + PostgreSQL. Admin aur Users ke do roles.

## Phase 1 mein kya hai
- Admin: users create/edit/deactivate (12 fields), auto Employee ID + password, password reset
- Admin dashboard: aaj ka har user (status, sign in time, IP, late, breaks count aur time, current task)
- User sign in karte hi attendance (server time + IP), late mark (shift start se 30 min ya zyada)
- 3 late = 1 off (settings se change ho sakta hai)
- Task start/end, Break start/Back, sab timestamp ke sath
- User dashboard: apna monthly record, late aur off count, profile edit, password change
- Monthly reports (department filter) aur CSV download

## Phase 2 mein kya hai
- Admin notification bhejta hai: All, sirf Sales ya sirf Production. Users apne dashboard par dekhte hain aur comment kar sakte hain. Admin edit/delete aur kisi bhi comment ko hata sakta hai
- Holiday announcement: notification ke sath dates select karein, calendar mein off lag jata hai (delete karne par calendar se bhi hat jata hai)
- User dashboard par calendar (holiday, leave, present, late) aur leave apply form
- Admin Leaves page par approve/reject (note ke sath), baad mein decision badal bhi sakta hai. User ko status aur note dikhta hai
- Nayi tables ke liye dobara `npm run migrate` chalayein (purana data safe rehta hai)

## Setup
1. Postgres database banayein (Neon ya Supabase free tier theek hai)
2. `.env.local` banayein (`.env.example` dekhein): DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
3. `npm install`
4. `npm run migrate` (tables banata hai)
5. `npm run seed` (pehla admin banata hai)
6. `npm run dev`

## Vercel deploy
Project import karein, environment variables DATABASE_URL aur JWT_SECRET set karein, deploy karein. Migrate aur seed apne computer se chalayein (DATABASE_URL production wali ke sath).

## Notes
- Time hamesha server se aata hai (user ke computer ki clock se nahi), Asia/Karachi mein dikhta hai (Settings mein badal sakte hain)
- IP wo public IP hai jo server ko nazar aata hai. Office ke sab computers ek hi router par hon to IP same dikhe ga
- Break start karne par chal raha task khud end ho jata hai
- Sign out par open break/task band ho jate hain

## Branding
Logo aur "Powered by Vistech Force" footer `lib/brand.ts` mein hain. Logo abhi techmindsdigital.co ke URL se load hota hai. Local copy chahiye to `public/` mein files rakh kar `lib/brand.ts` ke paths badal dein.

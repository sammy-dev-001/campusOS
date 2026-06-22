# CampusOS (EduFi) 🎓📱

CampusOS is a student-focused, all-in-one platform designed to make campus life easier, smarter, and more organized. It provides tools that help students manage academics, connect with peers, and stay productive—all in one place. Also known as EduFi, this application is built using React Native and Expo, offering comprehensive features for student finance, campus navigation, peer collaboration, and academic management.

It supports native deployment on **iOS** and **Android**, as well as a fully featured **web application**.

---

## 🚀 Key Features

### 💰 Smart Student Finance
* **Personal Finance Tracker**: Monitor your daily expenses, set category-specific budgets, and view visual analytics of your spending habits.
* **AI Financial Buddy**: Ask our specialized AI financial advisor for money-saving tips, budgeting strategies, and smart campus shopping recommendations.

### 🤖 AI Academic Assistant
* **AI Chat Buddy**: A built-in virtual companion to help you draft emails, explain academic concepts, get study tips, and ask general campus questions.

### 📍 Campus Navigation
* **Interactive Wayfinding Map**: Explore classrooms, administrative buildings, libraries, and campus services with an interactive map (supports native and web fallbacks).

### 📚 Academic Hub
* **Class Timetable & Reminders**: Organize your class schedule and receive timely notifications so you never miss a lecture.
* **GPA Tracker**: Log your course grades, monitor your semester GPAs, and keep track of your graduation requirements.
* **Resource Sharing**: Upload and download shared lecture notes, study guides, and past exam questions.

### 🤝 Social & Peer Collaboration
* **Student Discussion Forums**: Participate in topic-based communities to talk about courses, campus life, hobbies, and more.
* **Study Buddy Matcher**: Find study groups or match with study partners taking the same courses.
* **Tutor Finder**: Seek assistance from student tutors or offer your own tutoring services.
* **Roommate Finder**: Connect with compatible roommates on campus.
* **Campus Marketplace**: Buy and sell textbooks, room decor, electronics, and school supplies directly with other students.

### 📢 Student Engagement
* **Campus Announcements**: Stay updated with real-time official university announcements and event posts.
* **Polls & Surveys**: Create and vote in interactive student-run polls and surveys.

---

## 🛠️ Tech Stack
* **Framework**: [Expo](https://expo.dev/) (React Native)
* **Language**: TypeScript
* **State Management**: React Contexts
* **Database**: Local SQLite/Postgres support
* **UI Components**: React Native Paper, React Native Vector Icons, SVG Support

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### 2. Install Dependencies
Clone the repository and install the project dependencies:
```bash
npm install
```

### 3. Running the App
Start the Metro bundler to run the application:
```bash
# Start Expo development server (can scan QR code for Expo Go on iOS/Android)
npx expo start

# Run directly on Android emulator/device
npm run android

# Run directly on iOS simulator/device
npm run ios

# Run the web version in your browser
npm run web
```

### 4. Running Tests
Run the unit and integration tests using Jest:
```bash
npm test
```

---

## 📂 Project Directory Structure
* `/app` - File-based routing pages (Expo Router navigation screens)
* `/components` - Shared reusable React Native UI components
* `/constants` - Theme configurations, app colors, settings, and endpoints
* `/contexts` - Global state context providers (Auth, Theme, etc.)
* `/hooks` - Custom React hooks
* `/services` - API request helpers and integration files
* `/scripts` - Utilities, database setup, and debug scripts

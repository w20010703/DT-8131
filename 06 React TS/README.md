# React with TypeScript - Getting Started Tutorial

This tutorial will guide you through setting up a basic React application using TypeScript from scratch.

## Prerequisites

Before you begin, make sure you have the following installed on your system:

- **Node.js** (version 16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn** (optional)
- A code editor like **VS Code** (recommended)

## Method 1: Using Create React App (Recommended for Beginners)

### Step 1: Create a New React App with TypeScript

Open your terminal/command prompt and run:

```bash
npx create-react-app my-react-ts-app --template typescript
```

This command will:
- Create a new React application
- Set up TypeScript configuration
- Install all necessary dependencies
- Create a basic project structure

### Step 2: Navigate to Your Project

```bash
cd my-react-ts-app
```

### Step 3: Start the Development Server

```bash
npm start
```

Your app will open in the browser at `http://localhost:3000`

## Method 2: Manual Setup (For Learning Purposes)

If you want to understand the setup process better, you can create a React TypeScript app manually:

### Step 1: Create Project Directory

```bash
mkdir my-react-ts-app
cd my-react-ts-app
```

### Step 2: Initialize npm Project

```bash
npm init -y
```

### Step 3: Install Dependencies

```bash
# Install React and React DOM
npm install react react-dom

# Install TypeScript and type definitions
npm install --save-dev typescript @types/react @types/react-dom @types/node

# Install build tools
npm install --save-dev webpack webpack-cli webpack-dev-server
npm install --save-dev html-webpack-plugin ts-loader
```

### Step 4: Create TypeScript Configuration

Create a `tsconfig.json` file in your project root:

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": [
      "dom",
      "dom.iterable",
      "es6"
    ],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": [
    "src"
  ]
}
```

### Step 5: Create Webpack Configuration

Create a `webpack.config.js` file:

```javascript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.tsx',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
  devServer: {
    static: path.join(__dirname, 'dist'),
    port: 3000,
    hot: true,
  },
};
```

### Step 6: Create Project Structure

Create the following directory structure:

```
my-react-ts-app/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   └── App.tsx
│   ├── index.tsx
│   └── index.css
├── package.json
├── tsconfig.json
└── webpack.config.js
```

### Step 7: Create HTML Template

Create `public/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React TypeScript App</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>
```

### Step 8: Create React Components

Create `src/index.tsx`:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import './index.css';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `src/components/App.tsx`:

```tsx
import React, { useState } from 'react';

interface AppProps {
  // Define props here if needed
}

const App: React.FC<AppProps> = () => {
  const [count, setCount] = useState<number>(0);

  const handleIncrement = () => {
    setCount(count + 1);
  };

  const handleDecrement = () => {
    setCount(count - 1);
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Welcome to React with TypeScript!</h1>
      <p>Count: {count}</p>
      <button onClick={handleIncrement} style={{ margin: '5px' }}>
        Increment
      </button>
      <button onClick={handleDecrement} style={{ margin: '5px' }}>
        Decrement
      </button>
    </div>
  );
};

export default App;
```

Create `src/index.css`:

```css
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

button {
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  border: none;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
}

button:hover {
  background-color: #0056b3;
}
```

### Step 9: Add Scripts to package.json

Update your `package.json` scripts section:

```json
{
  "scripts": {
    "start": "webpack serve --mode development",
    "build": "webpack --mode production",
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

### Step 10: Start the Development Server

```bash
npm start
```

## Understanding TypeScript in React

### Key TypeScript Features in React

1. **Type Safety**: TypeScript helps catch errors at compile time
2. **Interface Definitions**: Define the shape of your props and state
3. **Type Inference**: TypeScript can often infer types automatically
4. **Generic Types**: Use generics for reusable components

### Example: Typed Component Props

```tsx
interface ButtonProps {
  text: string;
  onClick: () => void;
  disabled?: boolean; // Optional prop
  variant?: 'primary' | 'secondary'; // Union type
}

const Button: React.FC<ButtonProps> = ({ 
  text, 
  onClick, 
  disabled = false, 
  variant = 'primary' 
}) => {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {text}
    </button>
  );
};
```

### Example: Typed State

```tsx
interface User {
  id: number;
  name: string;
  email: string;
}

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // TypeScript will enforce that user has the correct shape
  return (
    <div>
      {user ? (
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
        </div>
      ) : (
        <p>No user data</p>
      )}
    </div>
  );
};
```

## Common TypeScript Patterns

### 1. Event Handlers

```tsx
const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  setValue(event.target.value);
};

const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  // Handle form submission
};
```

### 2. Ref Types

```tsx
const inputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  if (inputRef.current) {
    inputRef.current.focus();
  }
}, []);
```

### 3. Generic Components

```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

function List<T>({ items, renderItem }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}
```

## Next Steps

Once you have your basic React TypeScript app running:

1. **Explore React Hooks**: Learn about useState, useEffect, useContext, etc.
2. **Component Patterns**: Study higher-order components, render props, and custom hooks
3. **State Management**: Consider Redux Toolkit or Zustand for complex state
4. **Routing**: Add React Router for navigation
5. **Styling**: Explore CSS modules, styled-components, or Tailwind CSS
6. **Testing**: Set up Jest and React Testing Library
7. **Build Tools**: Learn about Vite as an alternative to Webpack

## Troubleshooting

### Common Issues

1. **TypeScript errors**: Make sure all imports have proper type definitions
2. **Build errors**: Check your tsconfig.json configuration
3. **Module resolution**: Ensure your import paths are correct

### Useful Commands

```bash
# Check for TypeScript errors
npx tsc --noEmit

# Build the project
npm run build

# Start development server
npm start
```

## Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Create React App Documentation](https://create-react-app.dev/docs/adding-typescript/)

Happy coding! 🚀

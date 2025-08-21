import { promises as fs } from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
import * as t from '@babel/types';
import type { PluginOption } from 'vite';

// Handle ES modules and CommonJS compatibility
const traverse = (_traverse as any).default || _traverse;
const generate = (_generate as any).default || _generate;

interface EditableElement {
  id: string;
  type: 'text' | 'className';
  content: string;
  originalValue?: string;
}

interface ComponentInfo {
  filePath: string;
  editableElements: EditableElement[];
}

interface UpdateRequest {
  elementId: string;
  type: 'text' | 'className';
  newValue: string;
  originalValue?: string;
}

interface IViteReactLiveEditor {
  isEditable?: boolean;
}

function viteReactLiveEditor(options: IViteReactLiveEditor = {}): PluginOption {
  const { isEditable = false } = options;
  
  let server: any;
  const editableComponents = new Map<string, ComponentInfo>();
  
  return {
    name: 'vaji-editor',
    enforce: 'pre', // Run before other plugins including @vitejs/plugin-react
    configureServer(devServer: any) {
      server = devServer;
      
      console.debug('vaji configureServer called, isEditable:', isEditable);
      
      if (!isEditable) return;
      
      console.debug('Setting up /vaji-internal/update-component endpoint');
      
      // API endpoint for receiving updates
      server.middlewares.use('/vaji-internal/update-component', async (req: any, res: any) => {
        console.debug('Update component endpoint called:', req.method);
        
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk.toString();
        });
        
        req.on('end', async () => {
          try {
            const { filePath, updates } = JSON.parse(body);
            await updateComponentFile(filePath, updates);
            
            // Trigger HMR
            const module = server.moduleGraph.getModuleById(filePath);
            if (module) {
              server.reloadModule(module);
            }
            
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (error: any) {
            console.error('Error updating component:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      });
    },
    
    transform(code: string, id: string) {
      console.debug('Transform called for:', id, 'isEditable:', isEditable);
      
      if (!isEditable || (!id.endsWith('.jsx') && !id.endsWith('.tsx'))) {
        return null;
      }
      
      console.debug('Processing file for live editing w vaji:', id);
      console.debug('Code snippet:', code.substring(0, 200) + '...');
      
      try {
        const ast = parse(code, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript', 'decorators-legacy']
        });
        
        let hasChanges = false;
        const componentInfo: ComponentInfo = {
          filePath: id,
          editableElements: []
        };
        
        traverse(ast, {
          JSXText(path: any) {
            console.debug('Found JSXText node:', path.node);
            const text = path.node.value;
            const trimmedText = text.trim();
            console.debug('JSX Text node value:', JSON.stringify(text), 'trimmed:', JSON.stringify(trimmedText));
            
            if (trimmedText && trimmedText.length >= 0) {
              console.debug('Found JSX text to make editable:', trimmedText);
              
              // Add editable wrapper around text
              const elementId = `editable_${Math.random().toString(36).substr(2, 9)}`;
              componentInfo.editableElements.push({
                id: elementId,
                type: 'text',
                content: trimmedText,
                originalValue: trimmedText
              });
              
              // Create JSX element properly
              const editableElement = t.jsxElement(
                t.jsxOpeningElement(
                  t.jsxIdentifier('EditableText'),
                  [
                    t.jsxAttribute(
                      t.jsxIdentifier('elementId'),
                      t.stringLiteral(elementId)
                    ),
                    t.jsxAttribute(
                      t.jsxIdentifier('filePath'),
                      t.stringLiteral(id)
                    ),
                    t.jsxAttribute(
                      t.jsxIdentifier('initialValue'),
                      t.stringLiteral(trimmedText)
                    )
                  ]
                ),
                t.jsxClosingElement(t.jsxIdentifier('EditableText')),
                [],
                false
              );
              
              // Replace the text node with our editable element directly (not wrapped in expression container)
              path.replaceWith(editableElement);
              hasChanges = true;
            }
          },
          enter(path: any) {
            if (path.node.type.startsWith('JSX')) {
              console.debug('JSX Node type:', path.node.type);
            }
          }
        });
        
        if (hasChanges) {
          console.debug('Adding EditableText imports to:', id);
          // Add imports for editable components using named import syntax
          const importDeclaration = t.importDeclaration(
            [
              t.importSpecifier(t.identifier('EditableText'), t.identifier('EditableText'))
            ],
            t.stringLiteral('virtual:vaji-editor')
          ) as t.Statement;
          
          // Access the program body correctly and add import at the beginning
          if (ast && ast.type === 'File' && ast.program) {
            ast.program.body.unshift(importDeclaration);
            console.debug('Import added to AST, new body length:', ast.program.body.length);
          } else if (ast && 'body' in ast) {
            (ast as any).body.unshift(importDeclaration);
            console.debug('Import added to AST (fallback), new body length:', (ast as any).body.length);
          } else {
            console.warn('Could not add import to AST - unexpected structure:', ast);
          }
          
          editableComponents.set(id, componentInfo);
          
          console.debug('Successfully transformed component:', id);
          
          const result = generate(ast);
          console.debug('Generated code snippet with imports:', result.code.substring(0, 400));
          return {
            code: result.code,
            map: result.map
          };
        } else {
          console.debug('No editable text found in:', id);
        }
        
        // Return null if no changes
        return null;
      } catch (error) {
        console.warn('Failed to transform component for live editing:', error);
        return null;
      }
    },
    
    resolveId(id: string) {
      console.debug('resolveId called with:', id);
      if (id === 'virtual:vaji-editor') {
        console.debug('Resolving virtual module:', id);
        return id;
      }
    },
    
    load(id: string) {
      console.debug('load called with:', id);
      if (id === 'virtual:vaji-editor') {
        console.debug('Loading virtual vaji-editor module');
        return `
import React, { useState } from 'react';

export function EditableText({ elementId, filePath, initialValue }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [isHovered, setIsHovered] = useState(false);

  const handleSave = async () => {
    try {
      console.debug('Saving changes:', { elementId, filePath, value });
      const response = await fetch('/vaji-internal/update-component', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath,
          updates: [{
            elementId,
            type: 'text',
            newValue: value,
            originalValue: initialValue
          }]
        })
      });
      
      if (response.ok) {
        console.debug('Successfully saved changes');
        setIsEditing(false);
      } else {
        console.error('Failed to save changes:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to update component:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return React.createElement('input', {
      type: 'text',
      value: value,
      onChange: (e) => setValue(e.target.value),
      onBlur: handleSave,
      onKeyDown: handleKeyDown,
      autoFocus: true,
      style: {
        border: '2px solid #3b82f6',
        borderRadius: '4px',
        padding: '2px 4px',
        background: '#ffffff',
        fontSize: 'inherit',
        fontFamily: 'inherit',
        color: 'inherit',
        outline: 'none',
        minWidth: '100px'
      }
    });
  }

  return React.createElement('span', {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
    onClick: () => {
      console.debug('EditableText clicked:', { elementId, initialValue });
      setIsEditing(true);
    },
    style: {
      cursor: 'pointer',
      outline: isHovered ? '2px dashed #3b82f6' : 'none',
      padding: '2px',
      borderRadius: '2px',
      position: 'relative',
      display: 'inline-block',
      backgroundColor: isHovered ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
    },
    title: 'Click to edit'
  }, [
    value,
    isHovered && React.createElement('span', {
      key: 'tooltip',
      style: {
        position: 'absolute',
        top: '-25px',
        left: '0',
        fontSize: '10px',
        background: '#3b82f6',
        color: 'white',
        padding: '2px 4px',
        borderRadius: '2px',
        whiteSpace: 'nowrap',
        zIndex: 1000,
        pointerEvents: 'none'
      }
    }, 'Click to edit')
  ].filter(Boolean));
}

export function useEditableClassName(elementId, filePath, initialValue) {
  const [value] = useState(initialValue);
  return value;
}
`;
      }
    }
  };
}

async function updateComponentFile(filePath: string, updates: UpdateRequest[]) {
  try {
    const code = await fs.readFile(filePath, 'utf8');
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy']
    });
    
    for (const update of updates) {
      if (update.type === 'text') {
        traverse(ast, {
          JSXText(path: any) {
            // Find the matching text node and update it
            const text = path.node.value.trim();
            if (text && shouldUpdateText(text, update)) {
              // Update the original text content
              const originalValue = update.originalValue || text;
              const newText = path.node.value.replace(originalValue, update.newValue);
              path.node.value = newText;
            }
          }
        });
      }
    }
    
    const newCode = generate(ast).code;
    await fs.writeFile(filePath, newCode, 'utf8');
  } catch (error) {
    console.error('Error updating file:', error);
    throw error;
  }
}

function shouldUpdateText(existingText: string, update: UpdateRequest) {
  // Simple matching logic - in a real implementation, you'd want more sophisticated matching
  return existingText.includes(update.originalValue || existingText);
}

export default viteReactLiveEditor;

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
  type: 'text' | 'className' | 'image';
  content: string;
  originalValue?: string;
  imageType?: 'url' | 'import';
  importName?: string;
}

interface ComponentInfo {
  filePath: string;
  editableElements: EditableElement[];
}

interface UpdateRequest {
  elementId: string;
  type: 'text' | 'className' | 'image';
  newValue: string;
  originalValue?: string;
  imageType?: 'url' | 'import';
  file?: File;
  importName?: string;
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

        const contentType = req.headers['content-type'] || '';

        if (contentType.includes('multipart/form-data')) {
          // Handle file upload for images
          const formidable = await import('formidable');
          const form = formidable.formidable({
            uploadDir: path.join(process.cwd(), 'public', 'images'),
            keepExtensions: true,
            maxFileSize: 10 * 1024 * 1024 // 10MB
          });

          try {
            const [fields, files] = await form.parse(req);
            console.debug('Form data received:', { fields, files });

            const filePath = Array.isArray(fields.filePath) ? fields.filePath[0] : fields.filePath;
            const elementId = Array.isArray(fields.elementId) ? fields.elementId[0] : fields.elementId;
            const imageType = Array.isArray(fields.imageType) ? fields.imageType[0] : fields.imageType;
            const newValue = Array.isArray(fields.newValue) ? fields.newValue[0] : fields.newValue;
            const originalValue = Array.isArray(fields.originalValue) ? fields.originalValue[0] : fields.originalValue;
            const importName = Array.isArray(fields.importName) ? fields.importName[0] : fields.importName;

            if (!filePath || !elementId || !newValue) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'filePath, elementId, and newValue are required' }));
              return;
            }

            let finalValue = newValue;

            if (files.file && Array.isArray(files.file) && files.file.length > 0) {
              const uploadedFile = files.file[0];
              const fileName = `${Date.now()}_${uploadedFile.originalFilename}`;
              const targetPath = path.join(process.cwd(), 'public', 'images', fileName);

              // Ensure directory exists
              await fs.mkdir(path.dirname(targetPath), { recursive: true });

              // Move file to target location
              await fs.rename(uploadedFile.filepath, targetPath);

              if (imageType === 'file') {
                // For file uploads, we need to create an import
                finalValue = `/images/${fileName}`;
              } else {
                finalValue = `/images/${fileName}`;
              }
            }

            console.debug('DEBUG: Processing image update with values:', {
              elementId,
              newValue,
              originalValue,
              finalValue,
              imageType,
              importName
            });

            const updates = [{
              elementId,
              type: 'image' as const,
              newValue: finalValue,
              originalValue: originalValue,
              imageType: imageType as 'url' | 'import',
              importName
            }];

            await updateComponentFile(filePath, updates);

            // Trigger HMR
            const module = server.moduleGraph.getModuleById(filePath);
            if (module) {
              server.reloadModule(module);
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, newSrc: finalValue }));
          } catch (error: any) {
            console.error('Error handling file upload:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
        } else {
          // Handle JSON data for text updates
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
        }
      });
    },

    transform(code: string, id: string) {
      console.debug('Transform called for:', id, 'isEditable:', isEditable);

      if (!isEditable || (!id.endsWith('.jsx') && !id.endsWith('.tsx'))) {
        return null;
      }

      console.debug('Processing file for live editing:', id);
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
          JSXElement(path: any) {
            // Check if this is an img element
            const openingElement = path.node.openingElement;
            if (openingElement.name && openingElement.name.name === 'img') {
              console.debug('Found img element:', openingElement);

              // Find the src attribute
              const srcAttribute = openingElement.attributes.find((attr: any) =>
                attr.type === 'JSXAttribute' && attr.name.name === 'src'
              );

              if (srcAttribute) {
                const elementId = `editable_img_${Math.random().toString(36).substr(2, 9)}`;
                let srcValue = '';
                let imageType: 'url' | 'import' = 'url';
                let importName = '';
                let originalSrcAttribute = srcAttribute.value;

                // Determine if it's a URL or import
                if (srcAttribute.value) {
                  if (srcAttribute.value.type === 'StringLiteral') {
                    srcValue = srcAttribute.value.value;
                    imageType = srcValue.startsWith('http') || srcValue.startsWith('data:') ? 'url' : 'import';
                  } else if (srcAttribute.value.type === 'JSXExpressionContainer') {
                    const expression = srcAttribute.value.expression;
                    if (expression.type === 'Identifier') {
                      importName = expression.name;
                      srcValue = importName;
                      imageType = 'import';
                    }
                  }
                }

                console.debug('Found editable image:', { srcValue, imageType, importName });

                componentInfo.editableElements.push({
                  id: elementId,
                  type: 'image',
                  content: srcValue,
                  originalValue: srcValue,
                  imageType,
                  importName
                });

                // Create editable image wrapper
                const editableImageElement = t.jsxElement(
                  t.jsxOpeningElement(
                    t.jsxIdentifier('EditableImage'),
                    [
                      t.jsxAttribute(
                        t.jsxIdentifier('elementId'),
                        t.stringLiteral(elementId)
                      ),
                      t.jsxAttribute(
                        t.jsxIdentifier('filePath'),
                        t.stringLiteral(id)
                      ),
                      // Preserve the original src attribute value (expression or string)
                      t.jsxAttribute(
                        t.jsxIdentifier('initialSrc'),
                        originalSrcAttribute
                      ),
                      t.jsxAttribute(
                        t.jsxIdentifier('imageType'),
                        t.stringLiteral(imageType)
                      ),
                      t.jsxAttribute(
                        t.jsxIdentifier('importName'),
                        t.stringLiteral(importName)
                      ),
                      t.jsxAttribute(
                        t.jsxIdentifier('originalValue'),
                        t.stringLiteral(srcValue)
                      ),
                      // Copy over other attributes
                      ...openingElement.attributes.filter((attr: any) =>
                        attr.type === 'JSXAttribute' && attr.name.name !== 'src'
                      )
                    ]
                  ),
                  t.jsxClosingElement(t.jsxIdentifier('EditableImage')),
                  [],
                  true // self-closing
                );

                // Replace the img element with our editable image element
                path.replaceWith(editableImageElement);
                hasChanges = true;
              }
            }
          },
          enter(path: any) {
            if (path.node.type.startsWith('JSX')) {
              console.debug('JSX Node type:', path.node.type);
            }
          }
        });

        if (hasChanges) {
          console.debug('Adding EditableText and EditableImage imports to:', id);
          // Add imports for editable components using named import syntax
          const importDeclaration = t.importDeclaration(
            [
              t.importSpecifier(t.identifier('EditableText'), t.identifier('EditableText')),
              t.importSpecifier(t.identifier('EditableImage'), t.identifier('EditableImage'))
            ],
            t.stringLiteral('virtual:vaji-editor')
          );

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
      return null;
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

export function EditableImage({ elementId, filePath, initialSrc, imageType, importName, originalValue, ...otherProps }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [isHovered, setIsHovered] = useState(false);
  const [uploadMode, setUploadMode] = useState('url'); // 'url' or 'file'

  const handleSave = async (newValue, file = null) => {
    try {
      console.debug('Saving image changes:', { elementId, filePath, newValue, file, uploadMode });
      console.debug('Values for form submission:', {
        elementId,
        initialSrc,
        originalValue,
        newValue,
        imageType,
        importName
      });
      
      const formData = new FormData();
      formData.append('elementId', elementId);
      formData.append('type', 'image');
      formData.append('filePath', filePath);
      formData.append('newValue', newValue);
      formData.append('originalValue', originalValue);
      formData.append('imageType', uploadMode);
      formData.append('importName', importName);
      
      if (file) {
        formData.append('file', file);
        console.debug('File upload - File details:', {
          name: file.name,
          size: file.size,
          type: file.type
        });
      }
      
      const response = await fetch('/vaji-internal/update-component', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        console.debug('Successfully saved image changes:', result);
        
        // Use the actual uploaded image path from server response if available
        const actualImageSrc = result.newSrc || newValue;
        console.debug('Setting image src from', currentSrc, 'to', actualImageSrc);
        setCurrentSrc(actualImageSrc);
        setIsEditing(false);
        
        // No need to reload the page - HMR will handle the update
        console.debug('Image updated to:', actualImageSrc);
      } else {
        const errorText = await response.text();
        console.error('Failed to save image changes:', response.statusText, errorText);
        console.error('Server response:', errorText);
      }
    } catch (error) {
      console.error('Failed to update image:', error);
      console.error('Error details:', error.message, error.stack);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      setCurrentSrc(previewUrl);
      
      // Save the file
      handleSave(file.name, file);
    }
  };

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setCurrentSrc(newUrl);
  };

  const handleUrlSave = () => {
    handleSave(currentSrc);
  };

  if (isEditing) {
    return React.createElement('div', {
      style: {
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        padding: '16px',
        background: '#ffffff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        minWidth: '300px',
        position: 'relative',
        zIndex: 1000
      }
    }, [
      React.createElement('div', {
        key: 'preview',
        style: { marginBottom: '12px', textAlign: 'center' }
      }, [
        React.createElement('img', {
          key: 'previewImg',
          src: currentSrc,
          alt: 'Preview',
          style: {
            maxWidth: '200px',
            maxHeight: '200px',
            border: '1px solid #e5e7eb',
            borderRadius: '4px'
          },
          onError: (e) => {
            e.target.style.display = 'none';
          }
        })
      ]),
      
      React.createElement('div', {
        key: 'modeSelector',
        style: { marginBottom: '12px' }
      }, [
        React.createElement('label', {
          key: 'urlLabel',
          style: { marginRight: '16px', cursor: 'pointer' }
        }, [
          React.createElement('input', {
            key: 'urlRadio',
            type: 'radio',
            name: 'uploadMode',
            checked: uploadMode === 'url',
            onChange: () => setUploadMode('url'),
            style: { marginRight: '4px' }
          }),
          'URL'
        ]),
        React.createElement('label', {
          key: 'fileLabel',
          style: { cursor: 'pointer' }
        }, [
          React.createElement('input', {
            key: 'fileRadio',
            type: 'radio',
            name: 'uploadMode',
            checked: uploadMode === 'file',
            onChange: () => setUploadMode('file'),
            style: { marginRight: '4px' }
          }),
          'Upload File'
        ])
      ]),
      
      uploadMode === 'url' ? [
        React.createElement('input', {
          key: 'urlInput',
          type: 'text',
          value: currentSrc,
          onChange: handleUrlChange,
          placeholder: 'Enter image URL',
          style: {
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            marginBottom: '8px',
            fontSize: '14px'
          }
        }),
        React.createElement('div', {
          key: 'urlButtons',
          style: { display: 'flex', gap: '8px' }
        }, [
          React.createElement('button', {
            key: 'saveUrl',
            onClick: handleUrlSave,
            style: {
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }
          }, 'Save'),
          React.createElement('button', {
            key: 'cancelUrl',
            onClick: () => {
              setCurrentSrc(initialSrc);
              setIsEditing(false);
            },
            style: {
              padding: '8px 16px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }
          }, 'Cancel')
        ])
      ] : [
        React.createElement('input', {
          key: 'fileInput',
          type: 'file',
          accept: 'image/*',
          onChange: handleFileUpload,
          style: {
            width: '100%',
            padding: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            marginBottom: '8px'
          }
        }),
        React.createElement('button', {
          key: 'cancelFile',
          onClick: () => {
            setCurrentSrc(initialSrc);
            setIsEditing(false);
          },
          style: {
            padding: '8px 16px',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }
        }, 'Cancel')
      ]
    ]);
  }

  return React.createElement('div', {
    style: {
      position: 'relative',
      display: 'inline-block'
    }
  }, [
    React.createElement('img', {
      key: 'editableImg',
      ...otherProps,
      src: currentSrc,
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
      onClick: () => {
        console.debug('EditableImage clicked:', { elementId, initialSrc });
        setIsEditing(true);
      },
      style: {
        ...otherProps.style,
        cursor: 'pointer',
        outline: isHovered ? '2px dashed #3b82f6' : 'none',
        transition: 'outline 0.2s ease'
      },
      title: 'Click to edit image'
    }),
    isHovered && React.createElement('div', {
      key: 'tooltip',
      style: {
        position: 'absolute',
        top: '-30px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '10px',
        background: '#3b82f6',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        whiteSpace: 'nowrap',
        zIndex: 1000,
        pointerEvents: 'none'
      }
    }, 'Click to edit image')
  ]);
}
`;
      }
      return null;
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
      } else if (update.type === 'image') {
        console.debug('Updating image in source file:', update);

        // find the img element by its src value to update images in the source file, not the transformed version.
        let imageFound = false;
        traverse(ast, {
          JSXElement(path: any) {
            if (imageFound) return;
            
            const openingElement = path.node.openingElement;

            // Only look for original img elements in the source file
            if (openingElement.name && openingElement.name.name === 'img') {
              const srcAttribute = openingElement.attributes.find((attr: any) =>
                attr.type === 'JSXAttribute' && attr.name.name === 'src'
              );

              if (srcAttribute) {
                let currentSrc = '';
                
                // Extract current src value
                if (srcAttribute.value && srcAttribute.value.type === 'StringLiteral') {
                  currentSrc = srcAttribute.value.value;
                } else if (srcAttribute.value && srcAttribute.value.type === 'JSXExpressionContainer') {
                  const expression = srcAttribute.value.expression;
                  if (expression.type === 'Identifier') {
                    currentSrc = expression.name;
                  }
                }

                console.debug('Checking img with src:', currentSrc, 'against originalValue:', update.originalValue);

                // todo: improve matching logic, maybe use elementId or other attributes
                if (currentSrc === update.originalValue ||
                  (update.importName && currentSrc === update.importName)) {

                  console.debug('Found matching image, updating from', currentSrc, 'to', update.newValue);

                  if (update.imageType === 'url') {
                    // Update with URL
                    srcAttribute.value = t.stringLiteral(update.newValue);
                    imageFound = true;
                    console.debug('Updated img src to URL:', update.newValue);
                  } else if (update.imageType === 'import' || update.imageType === 'file') {
                    // For file uploads, we need to add an import and update the src
                    const fileName = update.newValue.replace(/^.*\//, ''); // Get just the filename
                    const imageFileName = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
                    const importName = `${imageFileName}Image${Math.random().toString(36).substr(2, 4)}`;

                    // Add import statement
                    const importPath = update.newValue.startsWith('/') ? update.newValue : `/images/${fileName}`;
                    const importDeclaration = t.importDeclaration(
                      [t.importDefaultSpecifier(t.identifier(importName))],
                      t.stringLiteral(importPath)
                    );

                    // Add import to the beginning of the file
                    if (ast && ast.type === 'File' && ast.program) {
                      ast.program.body.unshift(importDeclaration);
                    }

                    // Update src to use the import
                    srcAttribute.value = t.jsxExpressionContainer(t.identifier(importName));
                    imageFound = true;
                    console.debug('Updated img src to import:', importName, 'from', importPath);
                  }
                }
              }
            }
          }
        });

        if (!imageFound) {
          console.error('Could not find image to update with originalValue:', update.originalValue);
        }
      }
    }

    const newCode = generate(ast).code;
    await fs.writeFile(filePath, newCode, 'utf8');
    console.debug('Successfully updated file:', filePath);
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

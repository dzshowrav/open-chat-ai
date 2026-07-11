import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { themeManager } from '../theme/themeManager.js';
import { Provider, Model } from '../../types/index.js';
import { BUILT_IN_THEMES } from '../../core/constants.js';
import { ApiEngine } from '../../api/apiEngine.js';
import { ToolManager } from '../../tools/toolManager.js';
import { PermissionRepository } from '../../database/repositories/permissionRepository.js';

// --- Reusable custom text input component ---
interface TextInputProps {
  value: string;
  onChange: (val: string) => void;
  mask?: string;
  placeholder?: string;
  active?: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({ value, onChange, mask, placeholder = '', active = false }) => {
  useInput((input: string, key: any) => {
    if (!active) return;
    
    if (key.backspace || key.delete) {
      onChange(value.slice(0, -1));
    } else if (key.return || key.escape || key.upArrow || key.downArrow || key.tab) {
      // Let parent handle navigation triggers
    } else if (input) {
      onChange(value + input);
    }
  });

  const displayValue = mask ? mask.repeat(value.length) : value;
  const cursor = active ? '█' : '';

  return (
    <Text color={active ? 'cyan' : 'white'}>
      {value.length === 0 ? <Text color="gray">{placeholder}</Text> : displayValue}
      <Text color="cyan">{cursor}</Text>
    </Text>
  );
};

// --- Provider List Dialog ---
interface ProviderListDialogProps {
  providers: Provider[];
  onSelect: (providerId: number) => void;
  onClose: () => void;
}

export const ProviderListDialog: React.FC<ProviderListDialogProps> = ({ providers, onSelect, onClose }) => {
  const theme = themeManager.getCurrentTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input: string, key: any) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (key.upArrow) {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : providers.length - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => (prev < providers.length - 1 ? prev + 1 : 0));
      return;
    }
    if (key.return) {
      if (providers[selectedIndex]) {
        onSelect(providers[selectedIndex].id!);
      }
      return;
    }
  });

  if (providers.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1} width={60}>
        <Text color="red" bold>No providers available. Run /provider api first.</Text>
        <Text color="gray">Press ESC to exit</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.primaryColor} padding={1} width={70}>
      <Text color={theme.primaryColor} bold>Configured Providers</Text>
      
      <Box flexDirection="column" marginY={1}>
        {providers.map((provider, idx) => {
          const isSelected = idx === selectedIndex;
          const bg = isSelected ? theme.primaryColor : undefined;
          
          return (
            <Box key={provider.id} paddingX={1} justifyContent="space-between">
              <Text color={isSelected ? 'black' : 'white'} bold={isSelected} backgroundColor={bg}>
                ● {provider.name}
              </Text>
              <Text color={isSelected ? 'black' : '#8e9aa8'} backgroundColor={bg}>
                {provider.base_url}
              </Text>
            </Box>
          );
        })}
      </Box>
      <Text color="gray" italic>Arrows: Navigate • ENTER: Edit • ESC: Close</Text>
    </Box>
  );
};

// --- Provider Dialog (Add / Edit Provider) ---
interface ProviderDialogProps {
  initialProvider?: Provider;
  onSubmit: (provider: { name: string; base_url: string; api_key: string; description?: string }) => void;
  onClose: () => void;
}

export const ProviderDialog: React.FC<ProviderDialogProps> = ({ initialProvider, onSubmit, onClose }) => {
  const theme = themeManager.getCurrentTheme();
  const [name, setName] = useState(initialProvider?.name || '');
  const [baseUrl, setBaseUrl] = useState(initialProvider?.base_url || '');
  const [apiKey, setApiKey] = useState(initialProvider?.api_key || '');
  const [description, setDescription] = useState(initialProvider?.description || '');
  
  const [activeField, setActiveField] = useState(0); // 0: Name, 1: Base URL, 2: API Key, 3: Description, 4: Test button, 5: Save button
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useInput(async (input: string, key: any) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (key.upArrow || (key.tab && key.shift)) {
      setActiveField(prev => (prev > 0 ? prev - 1 : 5));
      return;
    }
    if (key.downArrow || key.tab) {
      setActiveField(prev => (prev < 5 ? prev + 1 : 0));
      return;
    }
    if (key.return) {
      if (activeField === 4) {
        await handleTestConnection();
      } else if (activeField === 5) {
        handleSave();
      } else {
        setActiveField(prev => (prev < 5 ? prev + 1 : 5));
      }
      return;
    }
    // Fallback Ctrl shortcuts
    if (input === 't' && key.ctrl) {
      await handleTestConnection();
      return;
    }
    if (input === 's' && key.ctrl) {
      handleSave();
      return;
    }
  });

  const handleTestConnection = async () => {
    if (!baseUrl || !apiKey) {
      setTestResult('Error: Base URL and API Key are required to test.');
      return;
    }
    setIsTesting(true);
    setTestResult('Testing connection...');
    const res = await ApiEngine.testConnection(baseUrl, apiKey);
    setIsTesting(false);
    if (res.success) {
      setTestResult(`Success! Latency: ${res.latency}ms`);
    } else {
      setTestResult(`Failed: ${res.error}`);
    }
  };

  const handleSave = () => {
    if (!name || !baseUrl || !apiKey) {
      setTestResult('Error: Name, Base URL, and API Key are required.');
      return;
    }
    onSubmit({ name, base_url: baseUrl, api_key: apiKey, description });
  };

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.primaryColor} padding={1} width={70}>
      <Text color={theme.primaryColor} bold>{initialProvider ? 'Edit Provider' : 'Add OpenAI-Compatible Provider'}</Text>
      
      <Box flexDirection="column" marginY={1}>
        <Box flexDirection="row" marginY={0.2}>
          <Text color={activeField === 0 ? 'cyan' : 'white'} bold={activeField === 0}>{"Provider Name:  ".padEnd(16)}</Text>
          <TextInput value={name} onChange={setName} active={activeField === 0} placeholder="e.g. OpenCode Zen" />
        </Box>
        <Box flexDirection="row" marginY={0.2}>
          <Text color={activeField === 1 ? 'cyan' : 'white'} bold={activeField === 1}>{"Base URL:       ".padEnd(16)}</Text>
          <TextInput value={baseUrl} onChange={setBaseUrl} active={activeField === 1} placeholder="https://api.openai.com/v1" />
        </Box>
        <Box flexDirection="row" marginY={0.2}>
          <Text color={activeField === 2 ? 'cyan' : 'white'} bold={activeField === 2}>{"API Key:        ".padEnd(16)}</Text>
          <TextInput value={apiKey} onChange={setApiKey} active={activeField === 2} mask="*" placeholder="sk-..." />
        </Box>
        <Box flexDirection="row" marginY={0.2}>
          <Text color={activeField === 3 ? 'cyan' : 'white'} bold={activeField === 3}>{"Description:    ".padEnd(16)}</Text>
          <TextInput value={description} onChange={setDescription} active={activeField === 3} placeholder="Optional notes" />
        </Box>
      </Box>

      {testResult && (
        <Box marginY={1}>
          <Text color={testResult.startsWith('Success') ? 'green' : 'red'}>{testResult}</Text>
        </Box>
      )}

      <Box flexDirection="row" justifyContent="space-between" marginY={1}>
        <Box flexDirection="row">
          <Text 
            color={activeField === 4 ? 'black' : 'cyan'} 
            bold={activeField === 4} 
            backgroundColor={activeField === 4 ? 'cyan' : undefined}
          >
            {" [ Test Connection ] "}
          </Text>
          <Box marginLeft={2}>
            <Text 
              color={activeField === 5 ? 'black' : theme.primaryColor} 
              bold={activeField === 5} 
              backgroundColor={activeField === 5 ? theme.primaryColor : undefined}
            >
              {" [ Save Provider ] "}
            </Text>
          </Box>
        </Box>
        <Text color="gray">ESC: Cancel</Text>
      </Box>
    </Box>
  );
};

// --- Add Model Dialog ---
interface AddModelDialogProps {
  providers: Provider[];
  onSubmit: (modelData: {
    model_id: string;
    display_name: string;
    provider_id: number;
    description: string;
    category: string;
    context_window: number;
    max_output: number;
  }) => void;
  onClose: () => void;
}

export const AddModelDialog: React.FC<AddModelDialogProps> = ({ providers, onSubmit, onClose }) => {
  const theme = themeManager.getCurrentTheme();

  const [modelId, setModelId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [providerIndex, setProviderIndex] = useState(0);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('coding');
  const [contextWindow, setContextWindow] = useState('128000');
  const [maxOutput, setMaxOutput] = useState('4096');
  const [validationError, setValidationError] = useState<string | null>(null);

  const [activeField, setActiveField] = useState(0); // 0: Model ID, 1: Display Name, 2: Provider Index, 3: Description, 4: Category, 5: Context, 6: Max Output, 7: Submit/Save Button

  useInput((input: string, key: any) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.upArrow || (key.tab && key.shift)) {
      setActiveField(prev => (prev > 0 ? prev - 1 : 7));
      return;
    }
    if (key.downArrow || key.tab) {
      setActiveField(prev => (prev < 7 ? prev + 1 : 0));
      return;
    }

    // Provider select using left/right arrows
    if (activeField === 2 && providers.length > 0) {
      if (key.leftArrow) {
        setProviderIndex(prev => (prev > 0 ? prev - 1 : providers.length - 1));
      }
      if (key.rightArrow) {
        setProviderIndex(prev => (prev < providers.length - 1 ? prev + 1 : 0));
      }
    }

    // Category select using left/right arrows
    if (activeField === 4) {
      const cats = ['general', 'coding', 'reasoning', 'vision'];
      const curIdx = cats.indexOf(category);
      if (key.leftArrow) {
        setCategory(cats[curIdx > 0 ? curIdx - 1 : cats.length - 1]);
      }
      if (key.rightArrow) {
        setCategory(cats[curIdx < cats.length - 1 ? curIdx + 1 : 0]);
      }
    }

    if (key.return) {
      if (activeField === 7) {
        if (!modelId.trim()) {
          setValidationError('Validation Error: Model ID is required.');
          return;
        }
        if (!displayName.trim()) {
          setValidationError('Validation Error: Display Name is required.');
          return;
        }

        const selectedProvider = providers[providerIndex];
        if (!selectedProvider) {
          setValidationError('Validation Error: A configured Provider is required.');
          return;
        }

        onSubmit({
          model_id: modelId.trim(),
          display_name: displayName.trim(),
          provider_id: selectedProvider.id,
          description: description.trim(),
          category,
          context_window: parseInt(contextWindow) || 128000,
          max_output: parseInt(maxOutput) || 4096
        });
      } else {
        setValidationError(null);
        setActiveField(prev => (prev < 7 ? prev + 1 : 7));
      }
      return;
    }
  });

  const providerDisplay = providers.length > 0 
    ? (providers[providerIndex]?.name || 'Unknown') 
    : 'No providers configured (run /provider api)';

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.primaryColor} padding={1} width={70}>
      <Text color={theme.primaryColor} bold>Add AI Model</Text>

      <Box flexDirection="column" marginY={1}>
        <Box flexDirection="row" marginY={0.2}>
          <Text color={activeField === 0 ? 'cyan' : 'white'} bold={activeField === 0}>{"Model ID:       ".padEnd(16)}</Text>
          <TextInput value={modelId} onChange={setModelId} active={activeField === 0} placeholder="e.g. gpt-4o" />
        </Box>
        <Box flexDirection="row" marginY={0.2}>
          <Text color={activeField === 1 ? 'cyan' : 'white'} bold={activeField === 1}>{"Display Name:   ".padEnd(16)}</Text>
          <TextInput value={displayName} onChange={setDisplayName} active={activeField === 1} placeholder="e.g. GPT-4o" />
        </Box>
        <Box flexDirection="row" marginY={0.5}>
          <Text color={activeField === 2 ? 'cyan' : 'white'} bold={activeField === 2}>{"Provider:       ".padEnd(16)}</Text>
          <Text color={activeField === 2 ? 'black' : 'white'} backgroundColor={activeField === 2 ? theme.primaryColor : undefined}>
            {"< "} {providerDisplay} {" >"}
          </Text>
        </Box>
        <Box flexDirection="row" marginY={0.2}>
          <Text color={activeField === 3 ? 'cyan' : 'white'} bold={activeField === 3}>{"Description:    ".padEnd(16)}</Text>
          <TextInput value={description} onChange={setDescription} active={activeField === 3} placeholder="e.g. Standard OpenAI model" />
        </Box>
        <Box flexDirection="row" marginY={0.5}>
          <Text color={activeField === 4 ? 'cyan' : 'white'} bold={activeField === 4}>{"Category:       ".padEnd(16)}</Text>
          <Text color={activeField === 4 ? 'black' : 'white'} backgroundColor={activeField === 4 ? theme.primaryColor : undefined}>
            {"< "} {category.toUpperCase()} {" >"}
          </Text>
        </Box>
        <Box flexDirection="row" marginY={0.2}>
          <Text color={activeField === 5 ? 'cyan' : 'white'} bold={activeField === 5}>{"Context Limit:  ".padEnd(16)}</Text>
          <TextInput value={contextWindow} onChange={setContextWindow} active={activeField === 5} placeholder="128000" />
        </Box>
        <Box flexDirection="row" marginY={0.2}>
          <Text color={activeField === 6 ? 'cyan' : 'white'} bold={activeField === 6}>{"Max Output:     ".padEnd(16)}</Text>
          <TextInput value={maxOutput} onChange={setMaxOutput} active={activeField === 6} placeholder="4096" />
        </Box>
      </Box>

      {validationError && (
        <Box marginY={0.5}>
          <Text color="red" bold>{validationError}</Text>
        </Box>
      )}

      <Box flexDirection="row" justifyContent="space-between" marginY={1}>
        <Text color={activeField === 7 ? 'black' : theme.primaryColor} bold={activeField === 7} backgroundColor={activeField === 7 ? theme.primaryColor : undefined}>
          {" [ Save Model ] "}
        </Text>
        <Text color="gray">ESC: Cancel</Text>
      </Box>
    </Box>
  );
};

// --- Model Switcher Dialog ---
interface ModelSwitcherDialogProps {
  models: Array<Model & { provider_name: string }>;
  onSelect: (modelId: string, providerId: number) => void;
  onClose: () => void;
}

export const ModelSwitcherDialog: React.FC<ModelSwitcherDialogProps> = ({ models, onSelect, onClose }) => {
  const theme = themeManager.getCurrentTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input: string, key: any) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (key.upArrow) {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : models.length - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => (prev < models.length - 1 ? prev + 1 : 0));
      return;
    }
    if (key.return) {
      if (models[selectedIndex]) {
        onSelect(models[selectedIndex].model_id, models[selectedIndex].provider_id);
      }
      return;
    }
  });

  if (models.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1} width={60}>
        <Text color="red" bold>No models available. Run /add model first.</Text>
        <Text color="gray">Press ESC to exit</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.primaryColor} padding={1} width={70}>
      <Text color={theme.primaryColor} bold>Select AI Model</Text>
      
      <Box flexDirection="column" marginY={1}>
        {models.map((model, idx) => {
          const isSelected = idx === selectedIndex;
          const bg = isSelected ? theme.primaryColor : undefined;
          
          return (
            <Box key={model.id} paddingX={1} justifyContent="space-between">
              <Text color={isSelected ? 'black' : 'white'} bold={isSelected} backgroundColor={bg}>
                ● {model.display_name} <Text color={isSelected ? 'black' : '#8e9aa8'}>({model.model_id})</Text>
              </Text>
              <Text color={isSelected ? 'black' : theme.accentColor} backgroundColor={bg}>
                {model.provider_name}
              </Text>
            </Box>
          );
        })}
      </Box>
      <Text color="gray" italic>Arrows: Navigate • ENTER: Select • ESC: Cancel</Text>
    </Box>
  );
};

// --- Settings Dialog ---
interface SettingsDialogProps {
  currentThemeId: string;
  currentStreaming: boolean;
  onSave: (themeId: string, streaming: boolean) => void;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ currentThemeId, currentStreaming, onSave, onClose }) => {
  const theme = themeManager.getCurrentTheme();
  const themeIds = Object.keys(BUILT_IN_THEMES);
  
  const [selectedThemeIdx, setSelectedThemeIdx] = useState(themeIds.indexOf(currentThemeId));
  const [streaming, setStreaming] = useState(currentStreaming);
  const [activeItem, setActiveItem] = useState<0 | 1>(0); // 0: Theme select, 1: Streaming toggle

  useInput((input: string, key: any) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (key.upArrow || key.downArrow || key.tab) {
      setActiveItem(prev => (prev === 0 ? 1 : 0));
      return;
    }
    if (activeItem === 0) {
      // Left/Right arrow to change theme
      if (key.leftArrow) {
        setSelectedThemeIdx(prev => (prev > 0 ? prev - 1 : themeIds.length - 1));
      }
      if (key.rightArrow) {
        setSelectedThemeIdx(prev => (prev < themeIds.length - 1 ? prev + 1 : 0));
      }
    }
    if (activeItem === 1) {
      // Toggle streaming on Space or Left/Right
      if (input === ' ' || key.leftArrow || key.rightArrow) {
        setStreaming(prev => !prev);
      }
    }
    if (key.return) {
      onSave(themeIds[selectedThemeIdx], streaming);
      return;
    }
  });

  const themeDisplay = BUILT_IN_THEMES[themeIds[selectedThemeIdx]]?.name || themeIds[selectedThemeIdx];

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.primaryColor} padding={1} width={60}>
      <Text color={theme.primaryColor} bold>Global Settings</Text>
      
      <Box flexDirection="column" marginY={1}>
        <Box flexDirection="row" marginY={0.5}>
          <Text color={activeItem === 0 ? 'black' : 'white'} bold={activeItem === 0} backgroundColor={activeItem === 0 ? theme.primaryColor : undefined}>
            {"Theme:".padEnd(20)}
            {"< "} {themeDisplay} {" >"}
          </Text>
        </Box>
        
        <Box flexDirection="row" marginY={0.5}>
          <Text color={activeItem === 1 ? 'black' : 'white'} bold={activeItem === 1} backgroundColor={activeItem === 1 ? theme.primaryColor : undefined}>
            {"Streaming Response:".padEnd(20)}
            {"[ "}{streaming ? 'Enabled' : 'Disabled'}{" ] (Press Space)"}
          </Text>
        </Box>
      </Box>

      <Text color="gray" italic>Arrows: Modify Selection • ENTER: Save • ESC: Cancel</Text>
    </Box>
  );
};

// --- Permissions Prompt Dialog ---
interface PermissionsPromptDialogProps {
  toolName: string;
  args: Record<string, any>;
  onAllowOnce: () => void;
  onAlwaysAllow: () => void;
  onDeny: () => void;
}

export const PermissionsPromptDialog: React.FC<PermissionsPromptDialogProps> = ({ toolName, args, onAllowOnce, onAlwaysAllow, onDeny }) => {
  const theme = themeManager.getCurrentTheme();
  const [selectedIndex, setSelectedIndex] = useState(0); // 0: Allow Once, 1: Always Allow, 2: Deny

  useInput((input: string, key: any) => {
    if (key.upArrow || key.leftArrow) {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 2));
      return;
    }
    if (key.downArrow || key.rightArrow || key.tab) {
      setSelectedIndex(prev => (prev < 2 ? prev + 1 : 0));
      return;
    }
    if (key.return) {
      if (selectedIndex === 0) onAllowOnce();
      if (selectedIndex === 1) onAlwaysAllow();
      if (selectedIndex === 2) onDeny();
      return;
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1} width="100%">
      <Text color="yellow" bold>{"\u{F071} Security Request"}</Text>
      
      <Box flexDirection="column" marginY={0}>
        <Text color="cyan" bold>Tool: {toolName}</Text>
        <Text color="#8e9aa8">
          Args: {JSON.stringify(args).length > 80 ? JSON.stringify(args).substring(0, 80) + '...' : JSON.stringify(args)}
        </Text>
      </Box>

      <Box flexDirection="row" marginTop={1}>
        <Box marginRight={2}>
          <Text color={selectedIndex === 0 ? 'black' : 'green'} bold={selectedIndex === 0} backgroundColor={selectedIndex === 0 ? 'green' : undefined}>
            {" Allow "}
          </Text>
        </Box>
        <Box marginRight={2}>
          <Text color={selectedIndex === 1 ? 'black' : 'cyan'} bold={selectedIndex === 1} backgroundColor={selectedIndex === 1 ? 'cyan' : undefined}>
            {" Always "}
          </Text>
        </Box>
        <Box>
          <Text color={selectedIndex === 2 ? 'black' : 'red'} bold={selectedIndex === 2} backgroundColor={selectedIndex === 2 ? 'red' : undefined}>
            {" Deny "}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

// --- Agent Switcher Dialog ---
interface AgentSwitcherDialogProps {
  agents: any[];
  activeAgentId: number | string | null;
  onSelect: (agentId: string) => void;
  onClose: () => void;
}

export const AgentSwitcherDialog: React.FC<AgentSwitcherDialogProps> = ({ agents, activeAgentId, onSelect, onClose }) => {
  const theme = themeManager.getCurrentTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input: string, key: any) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (key.upArrow) {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : agents.length - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => (prev < agents.length - 1 ? prev + 1 : 0));
      return;
    }
    if (key.return) {
      if (agents[selectedIndex]) {
        onSelect(String(agents[selectedIndex].id));
      }
      return;
    }
  });

  if (agents.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1} width={50}>
        <Text color="red" bold>No agents found in databasePreset.</Text>
        <Text color="gray">Press ESC to exit</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.primaryColor} padding={1} width={65}>
      <Text color={theme.primaryColor} bold>Select Active Agent Preset</Text>
      <Box flexDirection="column" marginY={1}>
        {agents.map((agent, idx) => {
          const isSelected = idx === selectedIndex;
          const isActive = String(agent.id) === String(activeAgentId);
          const bg = isSelected ? theme.primaryColor : undefined;
          
          return (
            <Box key={agent.id} paddingX={1} justifyContent="space-between">
              <Text color={isSelected ? 'black' : 'white'} bold={isSelected} backgroundColor={bg}>
                {isActive ? '● ' : '  '} {agent.name}
              </Text>
              <Text color={isSelected ? 'black' : 'gray'} backgroundColor={bg}>
                {agent.description?.slice(0, 35) || 'No description'}
              </Text>
            </Box>
          );
        })}
      </Box>
      <Text color="gray" italic>Arrows: Navigate • ENTER: Select • ESC: Cancel</Text>
    </Box>
  );
};

// --- History Switcher Dialog ---
interface HistorySwitcherDialogProps {
  sessions: any[];
  onSelect: (sessionId: number) => void;
  onClose: () => void;
}

export const HistorySwitcherDialog: React.FC<HistorySwitcherDialogProps> = ({ sessions, onSelect, onClose }) => {
  const theme = themeManager.getCurrentTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input: string, key: any) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (key.upArrow) {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : sessions.length - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => (prev < sessions.length - 1 ? prev + 1 : 0));
      return;
    }
    if (key.return) {
      if (sessions[selectedIndex]) {
        onSelect(sessions[selectedIndex].id);
      }
      return;
    }
  });

  if (sessions.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} width={50}>
        <Text color="yellow" bold>No chat sessions in history.</Text>
        <Box marginY={1}>
          <Text color="gray">Ask the agent anything to start a new chat session!</Text>
        </Box>
        <Text color="gray">Press ESC to exit</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.primaryColor} padding={1} width={70}>
      <Text color={theme.primaryColor} bold>Resume Chat History</Text>
      <Box flexDirection="column" marginY={1}>
        {sessions.map((session, idx) => {
          const isSelected = idx === selectedIndex;
          const bg = isSelected ? theme.primaryColor : undefined;
          
          return (
            <Box key={session.id} paddingX={1} justifyContent="space-between">
              <Text color={isSelected ? 'black' : 'white'} bold={isSelected} backgroundColor={bg}>
                {"\u{F0B79} "}{session.title || `Session #${session.id}`}
              </Text>
              <Text color={isSelected ? 'black' : 'gray'} backgroundColor={bg}>
                {new Date(session.updated_at).toLocaleString().slice(0, 16)}
              </Text>
            </Box>
          );
        })}
      </Box>
      <Text color="gray" italic>Arrows: Navigate • ENTER: Resume • ESC: Cancel</Text>
    </Box>
  );
};

// --- Skills List Dialog ---
interface SkillsListDialogProps {
  skills: any[];
  onClose: () => void;
}

export const SkillsListDialog: React.FC<SkillsListDialogProps> = ({ skills, onClose }) => {
  const theme = themeManager.getCurrentTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input: string, key: any) => {
    if (key.escape || key.return) {
      onClose();
      return;
    }
    if (key.upArrow) {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : skills.length - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => (prev < skills.length - 1 ? prev + 1 : 0));
      return;
    }
  });

  if (skills.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} width={55}>
        <Text color="yellow" bold>No developer Skill Packs detected.</Text>
        <Box marginY={1}>
          <Text color="gray">To add one, create a subfolder with a SKILL.md file inside the skills/ directory of your project.</Text>
        </Box>
        <Text color="gray">Press ESC to exit</Text>
      </Box>
    );
  }

  const selectedSkill = skills[selectedIndex];

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.primaryColor} padding={1} width={75}>
      <Text color={theme.primaryColor} bold>Active Workspace Developer Skills ({skills.length})</Text>
      
      <Box flexDirection="row" marginY={1} height={12}>
        {/* Left Side: Skills list */}
        <Box flexDirection="column" width="30%" borderStyle="single" borderColor="gray" paddingX={1}>
          {skills.map((skill, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <Text key={skill.id} color={isSelected ? 'black' : 'white'} backgroundColor={isSelected ? theme.primaryColor : undefined} bold={isSelected}>
                {"\u{F03D6} "}{skill.name}
              </Text>
            );
          })}
        </Box>
        
        {/* Right Side: Preview instructions */}
        <Box flexDirection="column" width="70%" borderStyle="single" borderColor="gray" paddingX={1}>
          <Text color="cyan" bold>Instructions Preview:</Text>
          <Box marginY={0.5}>
            <Text color="gray">
              {selectedSkill?.instructions?.slice(0, 300) || 'No instructions text'}
              {(selectedSkill?.instructions?.length > 300) ? '...' : ''}
            </Text>
          </Box>
        </Box>
      </Box>
      
      <Text color="gray" italic>Arrows: Scroll • ENTER/ESC: Close</Text>
    </Box>
  );
};

// --- MCP List Dialog ---
interface McpListDialogProps {
  servers: any[];
  onClose: () => void;
}

export const McpListDialog: React.FC<McpListDialogProps> = ({ servers, onClose }) => {
  const theme = themeManager.getCurrentTheme();

  useInput((input: string, key: any) => {
    if (key.escape || key.return) {
      onClose();
      return;
    }
  });

  if (servers.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} width={55}>
        <Text color="yellow" bold>No Model Context Protocol (MCP) servers registered.</Text>
        <Box marginY={1}>
          <Text color="gray">To configure one, run queries directly on the mcp_servers database table.</Text>
        </Box>
        <Text color="gray">Press ESC to exit</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.primaryColor} padding={1} width={72}>
      <Text color={theme.primaryColor} bold>Configured MCP Servers ({servers.length})</Text>
      <Box flexDirection="column" marginY={1}>
        {servers.map((server) => {
          const statusColor = server.enabled === 1 ? 'green' : 'red';
          const statusText = server.enabled === 1 ? 'Connected' : 'Disabled';
          
          return (
            <Box key={server.id} paddingX={1} justifyContent="space-between">
              <Box flexDirection="row">
                <Text color="white" bold>{"\u{F0C71} "}{server.name} </Text>
                <Text color="gray">({server.command})</Text>
              </Box>
              <Text color={statusColor} bold>[ {statusText} ]</Text>
            </Box>
          );
        })}
      </Box>
      <Text color="gray" italic>Press ENTER or ESC to Close</Text>
    </Box>
  );
};

// --- Tools List Dialog ---
interface ToolsListDialogProps {
  onClose: () => void;
}

const TOOL_CATEGORIES: Record<string, string> = {
  read: 'file', read_file: 'file', write: 'file', write_file: 'file',
  edit: 'file', edit_file: 'file', list_directory: 'file', grep: 'file', glob: 'file',
  view_file: 'file', list_dir: 'file', write_to_file: 'file',
  replace_file_content: 'file', multi_replace_file_content: 'file', grep_search: 'file',
  bash: 'shell', git_status: 'shell', git_diff: 'shell',
  spawn_process: 'shell', read_process: 'shell', write_process: 'shell',
  kill_process: 'shell', list_processes: 'shell',
  run_command: 'shell', command_status: 'shell', manage_task: 'shell',
  fetch_url_content: 'web', search_web: 'web', webfetch: 'web',
  websearch: 'web', websearch_cited: 'web', read_url_content: 'web',
  type_check: 'typescript', lookup_type: 'typescript', list_types: 'typescript',
  delegate: 'agent', delegation_read: 'agent', delegation_list: 'agent', task: 'agent',
  define_subagent: 'agent', invoke_subagent: 'agent', manage_subagents: 'agent', send_message: 'agent',
  skill: 'skill', skill_find: 'skill', skill_use: 'skill', skill_resource: 'skill',
  question: 'utility', todowrite: 'utility', sequential_thinking: 'utility',
  search_memory: 'utility', list_tools: 'utility', tool_logs: 'utility',
  list_mcp_resources: 'mcp', list_mcp_resource_templates: 'mcp', read_mcp_resource: 'mcp',
  generate_image: 'utility', schedule: 'utility', ask_question: 'utility',
  ask_permission: 'utility', list_permissions: 'utility'
};

const CATEGORY_ICONS: Record<string, string> = {
  file: '\u{F0F6}', shell: '\u{F120}', web: '\u{F0AC}', typescript: '\u{E7B2}',
  agent: '\u{F06A9}', skill: '\u{F03D6}', utility: '\u{F0AD}', mcp: '\u{F1E6}', other: '•'
};

const CATEGORY_LABELS: Record<string, string> = {
  file: 'File Operations', shell: 'Shell & Execution', web: 'Web',
  typescript: 'TypeScript', agent: 'Agent Coordination', skill: 'Skills',
  utility: 'Utilities', mcp: 'MCP Resources', other: 'Other'
};

export const ToolsListDialog: React.FC<ToolsListDialogProps> = ({ onClose }) => {
  const theme = themeManager.getCurrentTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [permRepo] = useState(() => new PermissionRepository());
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const allSchemas = ToolManager.getToolSchemas();
  const filteredSchemas = filterCategory
    ? allSchemas.filter(s => TOOL_CATEGORIES[s.function.name] === filterCategory)
    : allSchemas;

  const categories = ['all', 'file', 'shell', 'web', 'typescript', 'agent', 'skill', 'utility', 'mcp'];
  const [catIndex, setCatIndex] = useState(0);

  useInput((input: string, key: any) => {
    if (key.escape) { onClose(); return; }
    if (key.upArrow) {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredSchemas.length - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => (prev < filteredSchemas.length - 1 ? prev + 1 : 0));
      return;
    }
    if (key.leftArrow) {
      const newIdx = catIndex > 0 ? catIndex - 1 : categories.length - 1;
      setCatIndex(newIdx);
      setFilterCategory(categories[newIdx] === 'all' ? null : categories[newIdx]);
      setSelectedIndex(0);
      return;
    }
    if (key.rightArrow) {
      const newIdx = catIndex < categories.length - 1 ? catIndex + 1 : 0;
      setCatIndex(newIdx);
      setFilterCategory(categories[newIdx] === 'all' ? null : categories[newIdx]);
      setSelectedIndex(0);
      return;
    }
    if (key.return) { onClose(); return; }
  });

  const selectedTool = filteredSchemas[selectedIndex];
  const selectedPerm = selectedTool
    ? permRepo.getPermission(selectedTool.function.name) || 'ask'
    : 'ask';

  const permColor: Record<string, string> = {
    always_allow: 'green', allow_once: 'cyan', ask: 'yellow', deny: 'red'
  };

  const currentCat = categories[catIndex];
  const catLabel = currentCat === 'all' ? 'All' : CATEGORY_LABELS[currentCat] || currentCat;
  const catCount = currentCat === 'all'
    ? allSchemas.length
    : allSchemas.filter(s => TOOL_CATEGORIES[s.function.name] === currentCat).length;

  const VP = 5;
  const viewStart = Math.max(0, Math.min(selectedIndex - Math.floor(VP / 2), filteredSchemas.length - VP));
  const visibleTools = filteredSchemas.slice(viewStart, viewStart + VP);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.primaryColor} paddingX={1} width={60}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={theme.primaryColor} bold>Registry ({allSchemas.length} tools)</Text>
        <Text color="gray">ESC/ENTER: Close</Text>
      </Box>

      {/* Compact single-line category selector */}
      <Box flexDirection="row" marginY={0.3} justifyContent="center">
        <Text color="gray">Category: </Text>
        <Text color={theme.accentColor} bold>{`◄  ${catLabel} (${catCount})  ►`}</Text>
      </Box>

      <Box flexDirection="column" marginY={0.3}>
        {/* Tool list */}
        <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
          {visibleTools.map((schema, vidx) => {
            const realIdx = viewStart + vidx;
            const isSelected = realIdx === selectedIndex;
            const cat = TOOL_CATEGORIES[schema.function.name] || 'other';
            const perm = permRepo.getPermission(schema.function.name) || 'ask';
            return (
              <Box key={schema.function.name} flexDirection="row" justifyContent="space-between">
                <Text
                  color={isSelected ? 'black' : 'white'}
                  backgroundColor={isSelected ? theme.primaryColor : undefined}
                  bold={isSelected}
                >
                  {isSelected ? '›' : ' '} {CATEGORY_ICONS[cat] || '•'} {schema.function.name}
                </Text>
                <Text color={isSelected ? 'black' : permColor[perm] || 'gray'} backgroundColor={isSelected ? theme.primaryColor : undefined}>
                  {perm === 'always_allow' ? '✔' : perm === 'deny' ? '✖' : perm === 'ask' ? '?' : '~'}
                </Text>
              </Box>
            );
          })}
          {filteredSchemas.length > VP && (
            <Box justifyContent="center">
              <Text color="#8e9aa8">
                {`-- [${selectedIndex + 1}/${filteredSchemas.length}] --`}
              </Text>
            </Box>
          )}
        </Box>

        {/* Selected tool detail stacked vertically */}
        {selectedTool && (
          <Box flexDirection="column" marginY={0.3} paddingX={1}>
            <Box flexDirection="row" justifyContent="space-between">
              <Text color={theme.accentColor} bold>{selectedTool.function.name}</Text>
              <Text color={permColor[selectedPerm] || 'yellow'} bold>{`Perm: ${selectedPerm}`}</Text>
            </Box>
            <Text color="gray" wrap="wrap">
              {(selectedTool.function.description as string).slice(0, 120)}...
            </Text>
          </Box>
        )}
      </Box>

      <Box justifyContent="center">
        <Text color="gray" italic>↑↓: Navigate  ←→: Change Cat</Text>
      </Box>
    </Box>
  );
};

// --- Tool Permissions Manager Dialog ---
interface ToolPermissionsDialogProps {
  onClose: () => void;
}

export const ToolPermissionsDialog: React.FC<ToolPermissionsDialogProps> = ({ onClose }) => {
  const theme = themeManager.getCurrentTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [permRepo] = useState(() => new PermissionRepository());
  const [, forceUpdate] = useState(0);

  const schemas = ToolManager.getToolSchemas();
  const permLevels: Array<'always_allow' | 'allow_once' | 'ask' | 'deny'> = ['always_allow', 'allow_once', 'ask', 'deny'];

  useInput((input: string, key: any) => {
    if (key.escape) { onClose(); return; }
    if (key.upArrow) {
      setSelectedIndex(prev => prev > 0 ? prev - 1 : schemas.length - 1);
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => prev < schemas.length - 1 ? prev + 1 : 0);
      return;
    }
    if (key.leftArrow || key.rightArrow) {
      const tool = schemas[selectedIndex];
      if (!tool) return;
      const curPerm = permRepo.getPermission(tool.function.name) || 'ask';
      const curIdx = permLevels.indexOf(curPerm as any);
      const newIdx = key.rightArrow
        ? (curIdx < permLevels.length - 1 ? curIdx + 1 : 0)
        : (curIdx > 0 ? curIdx - 1 : permLevels.length - 1);
      permRepo.setPermission(tool.function.name, permLevels[newIdx]);
      forceUpdate(n => n + 1);
      return;
    }
    if (key.return) { onClose(); return; }
  });

  const permColor: Record<string, string> = {
    always_allow: 'green', allow_once: 'cyan', ask: 'yellow', deny: 'red'
  };
  const permLabel: Record<string, string> = {
    always_allow: 'Always Allow', allow_once: 'Allow Once', ask: 'Ask', deny: 'Deny'
  };

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.primaryColor} padding={1} width={72}>
      <Text color={theme.primaryColor} bold>Tool Permissions Manager ({schemas.length} tools)</Text>
      {/* Sliding viewport — fixed item count, only color/text changes on nav (no layout shifts = no flicker) */}
      {(() => {
        const VP = 16;
        const viewStart = Math.max(0, Math.min(selectedIndex - Math.floor(VP / 2), schemas.length - VP));
        const visibleSchemas = schemas.slice(viewStart, viewStart + VP);
        const showScrollUp = viewStart > 0;
        const showScrollDown = viewStart + VP < schemas.length;
        return (
          <Box flexDirection="column" marginY={0.5}>
            {showScrollUp && <Text color="#8e9aa8">  ↑ {viewStart} more above</Text>}
            {visibleSchemas.map((schema, vidx) => {
              const realIdx = viewStart + vidx;
              const isSelected = realIdx === selectedIndex;
              const perm = permRepo.getPermission(schema.function.name) || 'ask';
              const cat = TOOL_CATEGORIES[schema.function.name] || 'other';
              return (
                <Box key={schema.function.name} flexDirection="row" justifyContent="space-between" paddingX={1}>
                  <Text
                    color={isSelected ? 'black' : 'white'}
                    backgroundColor={isSelected ? theme.primaryColor : undefined}
                    bold={isSelected}
                  >
                    {isSelected ? '›' : ' '} {CATEGORY_ICONS[cat] || '•'} {schema.function.name.padEnd(27)}
                  </Text>
                  <Text
                    color={isSelected ? 'black' : permColor[perm] || 'yellow'}
                    backgroundColor={isSelected ? theme.primaryColor : undefined}
                    bold={isSelected}
                  >
                    {permLabel[perm] || perm}
                  </Text>
                </Box>
              );
            })}
            {showScrollDown && <Text color="#8e9aa8">  ↓ {schemas.length - viewStart - VP} more below</Text>}
          </Box>
        );
      })()}
      <Box flexDirection="row" marginTop={0.5}>
        <Text color="green"> ✔ Always Allow </Text>
        <Text color="cyan"> ~ Allow Once </Text>
        <Text color="yellow"> ? Ask </Text>
        <Text color="red"> ✖ Deny </Text>
      </Box>
      <Text color="gray" italic>↑↓: Navigate  ←→: Change Permission  ENTER/ESC: Close</Text>
    </Box>
  );
};

// --- Interactive Question Dialog ---
interface QuestionDialogProps {
  question: string;
  options: string[];
  onSubmit: (answer: string) => void;
}

export const QuestionDialog: React.FC<QuestionDialogProps> = ({ question, options, onSubmit }) => {
  const theme = themeManager.getCurrentTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input: string, key: any) => {
    if (key.upArrow) {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : options.length - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => (prev < options.length - 1 ? prev + 1 : 0));
      return;
    }
    if (key.return) {
      if (options[selectedIndex]) {
        onSubmit(options[selectedIndex]);
      }
      return;
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.primaryColor} padding={1} width={72}>
      <Text color={theme.accentColor} bold>{"\u{F042C} "}Interactive Question</Text>
      <Box marginY={0.5} paddingX={1}>
        <Text color="white" bold>{question}</Text>
      </Box>
      
      <Box flexDirection="column" marginY={1}>
        {options.map((option, idx) => {
          const isSelected = idx === selectedIndex;
          const bg = isSelected ? theme.primaryColor : undefined;
          
          return (
            <Box key={idx} paddingX={1}>
              <Text color={isSelected ? 'black' : 'white'} bold={isSelected} backgroundColor={bg}>
                {isSelected ? '› ' : '  '}{option}
              </Text>
            </Box>
          );
        })}
      </Box>
      <Text color="gray" italic>↑↓ Arrows: Navigate • ENTER: Select Option</Text>
    </Box>
  );
};

// --- Backup & Restore Dialog ---
interface BackupRestoreDialogProps {
  initialMode: 'backup' | 'restore';
  onSubmit: (mode: 'backup' | 'restore', path: string) => void;
  onClose: () => void;
}

export const BackupRestoreDialog: React.FC<BackupRestoreDialogProps> = ({ initialMode, onSubmit, onClose }) => {
  const theme = themeManager.getCurrentTheme();
  const [mode, setMode] = useState<'backup' | 'restore'>(initialMode);
  const [filePath, setFilePath] = useState('backup.json');
  const [activeField, setActiveField] = useState(0); // 0: Action Select (mode), 1: File Path, 2: Run button

  useInput((input: string, key: any) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (key.upArrow || (key.tab && key.shift)) {
      setActiveField(prev => (prev > 0 ? prev - 1 : 2));
      return;
    }
    if (key.downArrow || key.tab) {
      setActiveField(prev => (prev < 2 ? prev + 1 : 0));
      return;
    }

    if (activeField === 0) {
      if (key.leftArrow || key.rightArrow) {
        setMode(prev => (prev === 'backup' ? 'restore' : 'backup'));
      }
    }

    if (key.return) {
      if (activeField === 2) {
        onSubmit(mode, filePath);
      } else {
        setActiveField(prev => (prev < 2 ? prev + 1 : 2));
      }
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.primaryColor} padding={1} width={70}>
      <Text color={theme.primaryColor} bold>Backup & Restore Credentials</Text>
      
      <Box flexDirection="column" marginY={1}>
        {/* Row 1: Action Type */}
        <Box flexDirection="row" marginY={0.2}>
          <Text color={activeField === 0 ? 'cyan' : 'white'} bold={activeField === 0}>
            {"Action:         ".padEnd(16)}
          </Text>
          <Box flexDirection="row">
            <Text 
              color={mode === 'backup' ? (activeField === 0 ? 'black' : 'green') : 'gray'}
              backgroundColor={mode === 'backup' && activeField === 0 ? 'cyan' : undefined}
              bold={mode === 'backup'}
            >
              [ Backup ]
            </Text>
            <Text>   </Text>
            <Text 
              color={mode === 'restore' ? (activeField === 0 ? 'black' : 'green') : 'gray'}
              backgroundColor={mode === 'restore' && activeField === 0 ? 'cyan' : undefined}
              bold={mode === 'restore'}
            >
              [ Restore ]
            </Text>
          </Box>
        </Box>

        {/* Row 2: File Path */}
        <Box flexDirection="row" marginY={0.2}>
          <Text color={activeField === 1 ? 'cyan' : 'white'} bold={activeField === 1}>
            {"File Path:      ".padEnd(16)}
          </Text>
          <TextInput 
            value={filePath} 
            onChange={setFilePath} 
            active={activeField === 1} 
            placeholder="e.g. backup.json" 
          />
        </Box>
      </Box>

      <Box flexDirection="row" justifyContent="space-between" marginY={1}>
        <Box flexDirection="row">
          <Text 
            color={activeField === 2 ? 'black' : theme.primaryColor} 
            bold={activeField === 2} 
            backgroundColor={activeField === 2 ? theme.primaryColor : undefined}
          >
            {mode === 'backup' ? " [ Start Backup ] " : " [ Start Restore ] "}
          </Text>
        </Box>
        <Text color="gray">Arrows: Navigate/Change • ENTER: Select/Execute • ESC: Cancel</Text>
      </Box>
    </Box>
  );
};

// --- Theme Switcher Dialog ---
interface ThemeSwitcherDialogProps {
  onPreview: (themeId: string) => void;
  onSelect: (themeId: string) => void;
  onClose: (revertThemeId: string) => void;
}

export const ThemeSwitcherDialog: React.FC<ThemeSwitcherDialogProps> = ({ onPreview, onSelect, onClose }) => {
  const currentTheme = themeManager.getCurrentTheme();
  const themeIds = Object.keys(BUILT_IN_THEMES);
  const [selectedIndex, setSelectedIndex] = useState(themeIds.indexOf(currentTheme.id) !== -1 ? themeIds.indexOf(currentTheme.id) : 0);
  const [initialThemeId] = useState(currentTheme.id);

  const VP = 8;
  const viewStart = Math.max(0, Math.min(selectedIndex - Math.floor(VP / 2), themeIds.length - VP));
  const visibleThemeIds = themeIds.slice(viewStart, viewStart + VP);

  // Trigger preview on index change
  useEffect(() => {
    onPreview(themeIds[selectedIndex]);
  }, [selectedIndex]);

  useInput((input: string, key: any) => {
    if (key.escape) {
      onClose(initialThemeId);
      return;
    }
    if (key.upArrow) {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : themeIds.length - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => (prev < themeIds.length - 1 ? prev + 1 : 0));
      return;
    }
    if (key.return) {
      onSelect(themeIds[selectedIndex]);
      return;
    }
  });

  const selectedThemeId = themeIds[selectedIndex];
  const selectedTheme = BUILT_IN_THEMES[selectedThemeId];

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={currentTheme.primaryColor} paddingX={1} width={60}>
      <Box flexDirection="row" justifyContent="space-between" marginBottom={0.3}>
        <Text color={currentTheme.primaryColor} bold>Theme Selector ({themeIds.length} themes)</Text>
        <Text color="gray">ESC: Close</Text>
      </Box>

      {/* Theme list viewport */}
      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
        {visibleThemeIds.map((id, vidx) => {
          const realIdx = viewStart + vidx;
          const isSelected = realIdx === selectedIndex;
          const theme = BUILT_IN_THEMES[id];
          return (
            <Box key={id} flexDirection="row" justifyContent="space-between">
              <Text
                color={isSelected ? 'black' : 'white'}
                backgroundColor={isSelected ? currentTheme.primaryColor : undefined}
                bold={isSelected}
              >
                {isSelected ? '›' : ' '} {theme.name} {theme.darkMode ? '🌙' : '☀️'}
              </Text>
              <Box flexDirection="row">
                <Text color={theme.primaryColor}>■ </Text>
                <Text color={theme.accentColor}>■</Text>
              </Box>
            </Box>
          );
        })}
        <Box justifyContent="center" marginTop={0.2}>
          <Text color="gray">
            {`-- [${selectedIndex + 1}/${themeIds.length}] --`}
          </Text>
        </Box>
      </Box>

      {/* Preview box */}
      {selectedTheme && (
        <Box flexDirection="column" marginY={0.3} paddingX={1}>
          <Box flexDirection="row" justifyContent="space-between">
            <Text color={currentTheme.accentColor} bold>Preview: {selectedTheme.name}</Text>
            <Text color="gray" italic>by {selectedTheme.author}</Text>
          </Box>
          <Box flexDirection="row" marginY={0.2}>
            <Text color="white">Primary: </Text>
            <Text color={selectedTheme.primaryColor} bold>{selectedTheme.primaryColor} ████</Text>
            <Text color="white">  Accent: </Text>
            <Text color={selectedTheme.accentColor} bold>{selectedTheme.accentColor} ████</Text>
          </Box>
        </Box>
      )}

      <Box justifyContent="center">
        <Text color="gray" italic>↑↓: Navigate  ENTER: Apply Theme</Text>
      </Box>
    </Box>
  );
};





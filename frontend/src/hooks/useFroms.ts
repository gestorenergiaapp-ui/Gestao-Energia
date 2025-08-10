import { useState, useEffect, useCallback } from 'react';
import _ from 'lodash';

/**
 * Um hook customizado para gerenciar o estado e o comportamento de formulários.
 * @param initialState O estado inicial do formulário.
 * @returns Um objeto contendo o estado do formulário, um manipulador de mudanças, e um booleano que indica se o formulário foi alterado.
 */
export const useForm = <T extends object>(initialState: T) => {
    const [formData, setFormData] = useState<T>(initialState);
    const [isDirty, setIsDirty] = useState(false);

    // Efeito para resetar o formulário quando o estado inicial mudar (ex: ao selecionar um item diferente para edição)
    useEffect(() => {
        setFormData(initialState);
    }, [initialState]);

    // Efeito para verificar se o formulário foi alterado em comparação com seu estado inicial
    useEffect(() => {
        setIsDirty(!_.isEqual(formData, initialState));
    }, [formData, initialState]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        const finalValue = type === 'checkbox'
            ? (e.target as HTMLInputElement).checked
            : value;

        setFormData(prev => ({
            ...prev,
            [name]: finalValue,
        }));
    }, []);

    const setSpecificValue = useCallback((key: keyof T, value: T[keyof T]) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    }, []);

    return {
        formData,
        setFormData,
        handleChange,
        isDirty,
        setSpecificValue
    };
};

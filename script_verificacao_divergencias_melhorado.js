// Script para verificar divergências entre dados duplicados nos blocos
// Cole este código no console do navegador na página

(function verificarDivergenciasBlocos() {
    console.log('🔍 VERIFICAÇÃO DE DIVERGÊNCIAS NOS BLOCOS (Versão Aprimorada v2)');
    console.log('─'.repeat(60));
    
    // Função para normalizar texto (remover espaços extras, pontuações especiais, etc)
    function normalizarTexto(texto) {
        return texto
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[.*()]/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            // Normalizar acentos comuns
            .replace(/Ã/g, 'A')
            .replace(/Õ/g, 'O')
            .replace(/Â/g, 'A')
            .replace(/Ê/g, 'E')
            .replace(/Î/g, 'I')
            .replace(/Ô/g, 'O')
            .replace(/Û/g, 'U')
            .replace(/À/g, 'A')
            .replace(/È/g, 'E')
            .replace(/Ì/g, 'I')
            .replace(/Ò/g, 'O')
            .replace(/Ù/g, 'U')
            .replace(/Á/g, 'A')
            .replace(/É/g, 'E')
            .replace(/Í/g, 'I')
            .replace(/Ó/g, 'O')
            .replace(/Ú/g, 'U')
            .replace(/Ç/g, 'C')
            .toUpperCase();
    }
    
    // Função para normalizar posto/graduação
    function normalizarPosto(texto) {
        return texto
            // Normalizar abreviações de postos/graduações
            .replace(/1º TEN(ENTE)?/gi, '1º TENENTE')
            .replace(/2º TEN(ENTE)?/gi, '2º TENENTE')
            .replace(/SUB\s+TEN/gi, 'SUBTENENTE')
            .replace(/1º SGT/gi, '1º SARGENTO')
            .replace(/2º SGT/gi, '2º SARGENTO')
            .replace(/3º SGT/gi, '3º SARGENTO')
            .replace(/1[°º]\s*SGT/gi, '1º SARGENTO')
            .replace(/2[°º]\s*SGT/gi, '2º SARGENTO')
            .replace(/3[°º]\s*SGT/gi, '3º SARGENTO')
            .replace(/\bCB\b/gi, 'CABO')
            .replace(/SD PM/gi, 'SOLDADO')
            .replace(/SOLDADO PM/gi, 'SOLDADO')
            .replace(/SOLDADO QPPM/gi, 'SOLDADO')
            .replace(/SOLDADO 2° CLASSE QPPM/gi, 'SOLDADO DE 2ª CLASSE')
            // Normalizar variações de SOLDADO
            .replace(/SOLDADO\s+DE\s+2[ªº°]\s+CLASSE/gi, 'SOLDADO')
            .replace(/SOLDADO\s+2[ªº°]\s+CLASSE/gi, 'SOLDADO')
            .replace(/CB PM/gi, 'CABO')
            .replace(/CABO PM/gi, 'CABO')
            .replace(/ST /gi, 'SUBTENENTE ')
            .replace(/SUBTENETE/gi, 'SUBTENENTE')
            .replace(/TEN CEL/gi, 'TENENTE CORONEL')
            .replace(/MAJ PM/gi, 'MAJOR')
            .replace(/CAP PM/gi, 'CAPITÃO')
            .replace(/CEL PM/gi, 'CORONEL')
            // Remover "PM" que aparece após postos/graduações
            .replace(/\b(CORONEL|TENENTE\s+CORONEL|MAJOR|CAPITÃO|1º\s+TENENTE|2º\s+TENENTE|SUBTENENTE|1º\s+SARGENTO|2º\s+SARGENTO|3º\s+SARGENTO|CABO|SOLDADO)\s+PM\b/gi, '$1')
            // Remover quadros específicos (não devem ser considerados divergência)
            .replace(/\s+QOPM\s+/gi, ' ') // Quadro de Oficiais Policiais Militares
            .replace(/\s+QPPM\s+/gi, ' ') // Quadro de Praças Policiais Militares
            .replace(/\s+QOA\s+/gi, ' ')  // Quadro de Oficiais de Administração
            .replace(/\s+QOAPM\s+/gi, ' ') // Quadro de Oficiais de Administração PM
            .replace(/\s+QOSPM\s+/gi, ' ') // Quadro de Oficiais de Saúde PM
            .replace(/\s+RG\.?\s+/gi, ' ') // Registro Geral
            .replace(/\s+REF\.?\s+/gi, ' ') // Reformado
            .replace(/\s+R\/R\s+/gi, ' ') // Reserva/Reformado
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    // Função para extrair nome (melhorada)
    function extrairNome(texto) {
        // Tentar várias variações de regex para nomes
        const patterns = [
            /O\(A\)\s+([^,]+?)\s+ESTÁ\s+AUTORIZADO/i,
            /O\(A\)\s+([^,]+?),.*?\s+ESTÁ\s+AUTORIZADO/i,
            /O\s+([^,]+?)\s+ESTÁ\s+AUTORIZADO/i,
            /A\s+([^,]+?)\s+ESTÁ\s+AUTORIZADO/i,
            // Padrões específicos para capturar nomes com vírgula
            /O\(A\)\s+([^,]+?)(?:,\s*CPF:.*?)?,\s+ESTÁ\s+AUTORIZADO/i,
            /O\s+([^,]+?)(?:,\s*CPF:.*?)?,\s+ESTÁ\s+AUTORIZADO/i,
            // Padrão específico para quando não há vírgula
            /O\(A\)\s+(.*?)\s+ESTÁ\s+AUTORIZADO/i,
            /O\s+(.*?)\s+ESTÁ\s+AUTORIZADO/i,
            // Padrão específico para capturar sem "O(A)" no início
            /A\s+(.*?)\s+ESTÁ\s+AUTORIZADO/i
        ];
        
        for (let pattern of patterns) {
            const match = texto.match(pattern);
            if (match) {
                let nome = match[1].trim();
                
                // Remover informações extras que podem estar no meio
                nome = nome.replace(/,\s*CPF:.*$/i, '');
                nome = nome.replace(/,.*$/i, ''); // Remove tudo após vírgula
                
                nome = normalizarPosto(nome);
                nome = normalizarTexto(nome);
                
                return nome.trim();
            }
        }
        return null;
    }
    
    // Função para extrair número de identificação (melhorada com suporte a dígitos censurados)
    function extrairNumeroId(texto) {
        const patterns = [
            /\*(\d{1,3}(?:\.\d{2})?|\d+\*+)\*?/,  // *815* ou *81** 
            /RG\.?\*?(\d{1,3}(?:\.\d{2})?|\d+\*+)\*?/,
            /\s+(\d{3})\s+/  // Número solto
        ];
        
        for (let pattern of patterns) {
            const match = texto.match(pattern);
            if (match) {
                let numero = match[1];
                
                // Se contém asteriscos no final, manter apenas os dígitos
                if (numero.includes('*')) {
                    numero = numero.replace(/\*+$/, ''); // Remove asteriscos do final
                }
                
                // Remover pontos
                numero = numero.replace(/\./g, '');
                
                // Se tem menos de 3 dígitos, adicionar zeros à esquerda
                return numero.padStart(3, '0');
            }
        }
        return null;
    }
    
    // Função para extrair período de afastamento (melhorada e mais específica)
    function extrairPeriodo(texto) {
        // Primeiro, remover trechos que podem confundir (data de apresentação e período aquisitivo)
        let textoLimpo = texto.replace(/DEVENDO APRESENTAR-SE.*?EM\s+\d{1,2}\/\d{1,2}\/\d{4}/gi, '');
        textoLimpo = textoLimpo.replace(/APRESENTAR-SE.*?EM\s+\d{1,2}\/\d{1,2}\/\d{4}/gi, '');
        // IMPORTANTE: Remover período aquisitivo para não confundir com período de afastamento
        textoLimpo = textoLimpo.replace(/COM\s+PERÍODO\s+AQUISITIVO\s+DE\s+\d{1,2}\/\d{1,2}\/\d{4}\s+A(?:TÉ)?\s+\d{1,2}\/\d{1,2}\/\d{4}/gi, '');
        textoLimpo = textoLimpo.replace(/PERÍODO\s+AQUISITIVO\s+DE\s+\d{1,2}\/\d{1,2}\/\d{4}\s+A(?:TÉ)?\s+\d{1,2}\/\d{1,2}\/\d{4}/gi, '');
        
        const patterns = [
            // Padrões específicos para AFASTAMENTO (não aquisitivo)
            /(?:NO\s+)?PERÍODO DE\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+A(?:TÉ)?\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
            /AFASTAR-SE\s+DO\s+SERVIÇO\s+(?:DO\s+DIA\s+|NO\s+PERÍODO\s+DE\s+)?(\d{1,2}\/\d{1,2}\/\d{4})\s+A(?:TÉ)?\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
            /DO DIA\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+A(?:O\s+DIA\s+|\s+)?(\d{1,2}\/\d{1,2}\/\d{4})/i,
            /A PARTIR DE\s+(\d{1,2}\/\d{1,2}\/\d{4})\s*¿?\s*ATÉ\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
            /DE\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+A(?:TÉ)?\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
            /EM\s+(\d{1,2}\/\d{1,2}\/\d{4})/i  // Para um dia só
        ];
        
        for (let pattern of patterns) {
            const match = textoLimpo.match(pattern);
            if (match) {
                if (match[2]) {
                    // Normalizar datas (garantir zeros à esquerda)
                    const data1 = normalizarData(match[1]);
                    const data2 = normalizarData(match[2]);
                    return `${data1} A ${data2}`;
                } else {
                    return normalizarData(match[1]); // Apenas um dia
                }
            }
        }
        return null;
    }
    
    // Função para normalizar datas (garantir formato DD/MM/AAAA)
    function normalizarData(data) {
        const partes = data.split('/');
        if (partes.length === 3) {
            const dia = partes[0].padStart(2, '0');
            const mes = partes[1].padStart(2, '0');
            const ano = partes[2];
            return `${dia}/${mes}/${ano}`;
        }
        return data;
    }
    
    // Função para extrair total de dias (melhorada com conversão de meses)
    function extrairTotalDias(texto) {
        const patterns = [
            // Padrões para dias
            /PERFAZENDO O TOTAL DE\s+(\d+)\s+DIA/i,
            /TOTAL DE\s+(\d+)\s+DIA/i,
            /PERFAZENDO O TOTAL DE\s+(\d+)/i,
            // Padrões para meses (converter para dias)
            /NUM TOTAL DE\s+(\d+)\s+(?:\([^)]+\))?\s*MES/i,
            /TOTAL DE\s+(\d+)\s+(?:\([^)]+\))?\s*MES/i,
            /PERFAZENDO O TOTAL DE\s+(\d+)\s+(?:\([^)]+\))?\s*MES/i,
            // Padrão genérico (última tentativa)
            /(?:NUM\s+)?TOTAL DE\s+(\d+)/i
        ];
        
        for (let pattern of patterns) {
            const match = texto.match(pattern);
            if (match) {
                const numero = parseInt(match[1]);
                
                // Verificar se o texto contém "MES" para converter
                if (pattern.source.includes('MES') || /MES/i.test(match[0])) {
                    // Converter meses para dias (assumindo 30.4 dias por mês em média)
                    return Math.round(numero * 30.4);
                }
                
                return numero;
            }
        }
        return null;
    }
    
    // Função para extrair motivo (melhorada e normalizada)
    function extrairMotivo(texto) {
        const regex = /MOTIVO:\s+([^.]+?)(?:\.|EXERCÍCIO|COM\s+PERÍODO|DEVENDO|CONFORME|$)/i;
        const match = texto.match(regex);
        if (match) {
            let motivo = match[1].trim();
            
            // Verificar se há motivo específico entre parênteses
            const motivoParenteses = motivo.match(/\(([^)]+)\)/);
            
            // Se o motivo entre parênteses é mais específico que o motivo geral, usar ele
            if (motivoParenteses) {
                const motivoGeral = motivo.replace(/\s*\([^)]*\)/, '').trim();
                const motivoEspecifico = motivoParenteses[1].trim();
                
                // Casos onde o motivo entre parênteses é mais específico
                if (motivoGeral.includes('INTERESSE DO SERVIÇO') && 
                    (motivoEspecifico.includes('RECONCESSÃO') || 
                     motivoEspecifico.includes('FÉRIAS') ||
                     motivoEspecifico.includes('RECOMPENSA'))) {
                    motivo = motivoEspecifico;
                } else {
                    // Remover parênteses normalmente
                    motivo = motivoGeral;
                }
            }
            
            // Normalizar motivos comuns - extrair apenas o motivo principal
            motivo = motivo
                // Remover parênteses restantes e conteúdo (detalhes extras)
                .replace(/\s*\([^)]*\)/g, '')
                // Remover detalhes após vírgula (informações complementares)
                .replace(/,.*$/g, '')
                // Normalizar termos específicos
                .replace(/A PEDIDO\s*/gi, '')
                .replace(/RECONCESSÃO.*$/gi, 'RECONCESSÃO')
                .replace(/FÉRIAS.*$/gi, 'FÉRIAS')
                .replace(/A TÍTULO DE RECOMPENSA.*$/gi, 'A TÍTULO DE RECOMPENSA')
                .replace(/LICENÇA ESPECIAL.*$/gi, 'LICENÇA ESPECIAL')
                .replace(/LICENÇA PARA TRATAMENTO DE SAÚDE.*$/gi, 'LICENÇA PARA TRATAMENTO DE SAÚDE')
                .replace(/LICENÇA PATERNIDADE.*$/gi, 'LICENÇA PATERNIDADE')
                .replace(/LICENÇA MATERNIDADE.*$/gi, 'LICENÇA MATERNIDADE')
                .replace(/LICENÇA PRÊMIO.*$/gi, 'LICENÇA PRÊMIO')
                .replace(/INTERESSE DO SERVIÇO\s*/gi, 'INTERESSE DO SERVIÇO')
                .replace(/DISPENSA\s+A\s+TÍTULO\s+DE\s+RECOMPENSA/gi, 'A TÍTULO DE RECOMPENSA')
                .replace(/CONCESSÃO DE FÉRIAS/gi, 'FÉRIAS')
                // Remover prefixos/sufixos desnecessários
                .replace(/^(PARA\s+|DE\s+|A\s+)?/gi, '')
                .replace(/\s+(PRÓPRIO|PRÓPRIA)$/gi, '')
                .trim();
                
            return normalizarTexto(motivo);
        }
        return null;
    }
    
    // Função para extrair exercício
    function extrairExercicio(texto) {
        const regex = /EXERCÍCIO:\s*(\d{4})/i;
        const match = texto.match(regex);
        return match ? parseInt(match[1]) : null;
    }
    
    // Função para extrair assinatura (última palavra do bloco)
    function extrairAssinatura(texto) {
        const palavras = texto.trim().split(/\s+/);
        return palavras.length > 0 ? palavras[palavras.length - 1] : 'Assinatura não encontrada';
    }
    
    // Função para comparar dois valores (melhorada)
    function compararValores(valor1, valor2, campo) {
        // Se ambos são null
        if (valor1 === null && valor2 === null) {
            return { igual: true, observacao: `${campo}: Ambos os valores não encontrados` };
        }
        
        // Se apenas um é null
        if (valor1 === null || valor2 === null) {
            // Para alguns campos, é muito comum que apenas uma parte tenha o valor
            if (campo === 'Período' || campo === 'Total Dias' || campo === 'Exercício' || campo === 'Número ID') {
                return { igual: true, observacao: `${campo}: Valor presente apenas em uma parte (normal)` };
            }
            
            // Para nome, só consideramos problema se ambos são null
            if (campo === 'Nome') {
                // Se um nome é válido e o outro não foi encontrado, assumir que são o mesmo
                const nomeValido = valor1 || valor2;
                if (nomeValido && nomeValido.toString().trim().length > 0) {
                    return { igual: true, observacao: `${campo}: Nome encontrado apenas em uma parte (assumindo consistência)` };
                }
                return { igual: false, observacao: `${campo}: ATENÇÃO - Nome não encontrado em nenhuma das partes` };
            }
            
            return { igual: true, observacao: `${campo}: Um valor não encontrado (provavelmente normal)` };
        }
        
        // Comparação especial para números (Total Dias, Número ID)
        if (campo === 'Total Dias' || campo === 'Número ID') {
            if (campo === 'Total Dias') {
                const num1 = parseInt(valor1.toString().replace(/\D/g, ''));
                const num2 = parseInt(valor2.toString().replace(/\D/g, ''));
                
                // Para dias, considerar uma margem de tolerância de ±4 dias
                // (para variações entre conversão de meses e dias exatos)
                const diferenca = Math.abs(num1 - num2);
                
                if (diferenca === 0) {
                    return { igual: true, observacao: `${campo}: OK (${valor1} = ${valor2})` };
                } else if (diferenca <= 4) {
                    return { igual: true, observacao: `${campo}: OK (${valor1} ≈ ${valor2} - diferença aceitável de ${diferenca} dias)` };
                } else {
                    return { igual: false, observacao: `${campo}: DIVERGÊNCIA REAL (${num1} ≠ ${num2} - diferença de ${diferenca} dias)` };
                }
            } else {
                // Para Número ID, verificar se um é prefixo do outro (números censurados)
                const id1 = valor1.toString().replace(/\D/g, '');
                const id2 = valor2.toString().replace(/\D/g, '');
                
                // Se são exatamente iguais
                if (id1 === id2) {
                    return { igual: true, observacao: `${campo}: OK (${valor1} = ${valor2})` };
                }
                
                // Se um é prefixo do outro (números censurados)
                if (id1.startsWith(id2) || id2.startsWith(id1)) {
                    const menor = id1.length < id2.length ? id1 : id2;
                    const maior = id1.length >= id2.length ? id1 : id2;
                    return { igual: true, observacao: `${campo}: OK (${menor} é prefixo de ${maior} - número censurado)` };
                }
                
                // São realmente diferentes
                return { igual: false, observacao: `${campo}: DIVERGÊNCIA REAL (${id1} ≠ ${id2})` };
            }
        }
        
        // Comparação especial para nomes (verificar se um contém o outro)
        if (campo === 'Nome') {
            const nome1 = valor1.toString().replace(/\s+/g, ' ').trim();
            const nome2 = valor2.toString().replace(/\s+/g, ' ').trim();
            
            // Normalizar ambos os nomes removendo quadros e formatação extra
            function normalizarNomeCompleto(nome) {
                return nome
                    // Primeiro normalizar variações de soldado
                    .replace(/SOLDADO\s+DE\s+2[ªº°]\s+CLASSE/gi, 'SOLDADO')
                    .replace(/SOLDADO\s+2[ªº°]\s+CLASSE/gi, 'SOLDADO')
                    // Normalizar abreviações de postos
                    .replace(/\bCB\b/gi, 'CABO')
                    .replace(/1[°º]\s*SGT/gi, '1º SARGENTO')
                    .replace(/2[°º]\s*SGT/gi, '2º SARGENTO')
                    .replace(/3[°º]\s*SGT/gi, '3º SARGENTO')
                    .replace(/SUB\s+TEN/gi, 'SUBTENENTE')
                    // Remover "PM" após postos/graduações específicos
                    .replace(/\b(CORONEL|TENENTE\s+CORONEL|MAJOR|CAPITÃO|1º\s+TENENTE|2º\s+TENENTE|SUBTENENTE|1º\s+SARGENTO|2º\s+SARGENTO|3º\s+SARGENTO|CABO|SOLDADO)\s+PM\b/gi, '$1')
                    // IMPORTANTE: Remover quadros em qualquer posição - melhorada
                    .replace(/\bQOPM\b/gi, '')  // Quadro de Oficiais Policiais Militares
                    .replace(/\bQPPM\b/gi, '')  // Quadro de Praças Policiais Militares  
                    .replace(/\bQOA\b/gi, '')   // Quadro de Oficiais de Administração
                    .replace(/\bQOAPM\b/gi, '') // Quadro de Oficiais de Administração PM
                    .replace(/\bQOSPM\b/gi, '') // Quadro de Oficiais de Saúde PM
                    .replace(/\s+RG\.?\*?\d*\s+/gi, ' ')
                    .replace(/\s+REF\.?\s+/gi, ' ')
                    .replace(/\s+R\/R\s+/gi, ' ')
                    // Remover números de identificação em vários formatos (incluindo colados)
                    .replace(/\*\d+(?:\.\d+)?\*/g, '') // *123* ou *1.23*
                    .replace(/X\d+X/g, '') // X123X
                    .replace(/\s+\d+\s+/g, ' ') // números soltos com espaços
                    .replace(/\d+(?=[A-Z])/g, '') // números colados antes de letras (194RODRIGO -> RODRIGO)
                    // Remover "&nbsp;" que pode aparecer
                    .replace(/&nbsp;/g, ' ')
                    // Normalizar acentos e caracteres especiais
                    .replace(/Ã/g, 'A')
                    .replace(/Õ/g, 'O')
                    .replace(/Â/g, 'A')
                    .replace(/Ê/g, 'E')
                    .replace(/Î/g, 'I')
                    .replace(/Ô/g, 'O')
                    .replace(/Û/g, 'U')
                    .replace(/À/g, 'A')
                    .replace(/È/g, 'E')
                    .replace(/Ì/g, 'I')
                    .replace(/Ò/g, 'O')
                    .replace(/Ù/g, 'U')
                    .replace(/Á/g, 'A')
                    .replace(/É/g, 'E')
                    .replace(/Í/g, 'I')
                    .replace(/Ó/g, 'O')
                    .replace(/Ú/g, 'U')
                    .replace(/Ç/g, 'C')
                    // Limpar espaços
                    .replace(/\s+/g, ' ')
                    .trim()
                    .toUpperCase();
            }
            
            const nomeNormalizado1 = normalizarNomeCompleto(nome1);
            const nomeNormalizado2 = normalizarNomeCompleto(nome2);
            
            // Verificar se são iguais após normalização
            if (nomeNormalizado1 === nomeNormalizado2) {
                return { igual: true, observacao: `${campo}: OK (mesmo nome, diferença apenas no formato/acentuação)` };
            }
            
            // Verificar se um contém o outro (para casos onde um é mais completo)
            if (nomeNormalizado1.includes(nomeNormalizado2) || nomeNormalizado2.includes(nomeNormalizado1)) {
                return { igual: true, observacao: `${campo}: OK (variações do mesmo nome)` };
            }
            
            // Se chegou até aqui, são realmente diferentes
            return { igual: false, observacao: `${campo}: DIVERGÊNCIA REAL - Nomes diferentes (${nomeNormalizado1} ≠ ${nomeNormalizado2})` };
        }
        
        // Comparação especial para motivos
        if (campo === 'Motivo') {
            const motivo1 = valor1.toString().toUpperCase().trim();
            const motivo2 = valor2.toString().toUpperCase().trim();
            
            // Se são exatamente iguais
            if (motivo1 === motivo2) {
                return { igual: true, observacao: `${campo}: OK` };
            }
            
            // Função para extrair motivo base (sem detalhes)
            function extrairMotivoBase(motivo) {
                return motivo
                    // Remover detalhes entre parênteses
                    .replace(/\s*\([^)]*\)/g, '')
                    // Remover detalhes após vírgula
                    .replace(/,.*$/g, '')
                    // Remover detalhes após "CONFORME"
                    .replace(/\s+CONFORME.*$/gi, '')
                    // Remover detalhes após "SEGUNDO"
                    .replace(/\s+SEGUNDO.*$/gi, '')
                    // Remover detalhes após "DE ACORDO"
                    .replace(/\s+DE\s+ACORDO.*$/gi, '')
                    // Normalizar espaços
                    .replace(/\s+/g, ' ')
                    .trim();
            }
            
            const motivoBase1 = extrairMotivoBase(motivo1);
            const motivoBase2 = extrairMotivoBase(motivo2);
            
            // Comparar motivos base
            if (motivoBase1 === motivoBase2) {
                return { igual: true, observacao: `${campo}: OK (mesmo motivo base, detalhes extras ignorados)` };
            }
            
            // Se um contém o outro (variações do mesmo motivo)
            if (motivoBase1.includes(motivoBase2) || motivoBase2.includes(motivoBase1)) {
                return { igual: true, observacao: `${campo}: OK (variações do mesmo motivo)` };
            }
            
            // Verificar motivos sinônimos comuns
            const sinonimos = [
                ['FÉRIAS', 'CONCESSÃO DE FÉRIAS', 'INTERESSE DO SERVIÇO FÉRIAS'],
                ['RECONCESSÃO', 'RECONCESSÃO DE FÉRIAS', 'INTERESSE DO SERVIÇO RECONCESSÃO'],
                ['A TÍTULO DE RECOMPENSA', 'DISPENSA A TÍTULO DE RECOMPENSA', 'RECOMPENSA', 'INTERESSE DO SERVIÇO RECOMPENSA'],
                ['LICENÇA ESPECIAL', 'LIC ESPECIAL', 'LIC. ESPECIAL'],
                ['LICENÇA PARA TRATAMENTO DE SAÚDE', 'LTS', 'TRATAMENTO DE SAÚDE', 'LICENÇA TRATAMENTO SAÚDE'],
                ['INTERESSE DO SERVIÇO', 'SERVIÇO', 'INT. SERVIÇO']
            ];
            
            for (let grupo of sinonimos) {
                const tem1 = grupo.some(sin => motivoBase1.includes(sin));
                const tem2 = grupo.some(sin => motivoBase2.includes(sin));
                if (tem1 && tem2) {
                    return { igual: true, observacao: `${campo}: OK (motivos sinônimos)` };
                }
            }
            
            // São realmente diferentes
            return { igual: false, observacao: `${campo}: DIVERGÊNCIA REAL - Motivos diferentes (${motivoBase1} ≠ ${motivoBase2})` };
        }
        
        const igual = valor1.toString() === valor2.toString();
        return { 
            igual, 
            observacao: igual ? `${campo}: OK` : `${campo}: DIVERGÊNCIA REAL (${valor1} ≠ ${valor2})` 
        };
    }
    
    // Função melhorada para dividir o bloco
    function dividirBloco(textoCompleto) {
        // Limpar HTML tags primeiro
        let textoLimpo = textoCompleto.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Primeiro, tentar dividir por <br>
        let partes = textoCompleto.split('<br>');
        
        if (partes.length >= 2) {
            const primeiraParte = partes[0].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            const segundaParte = partes.slice(1).join(' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            return { primeiraParte, segundaParte };
        }
        
        // Estratégia 1: Dividir por "O " seguido de posto (sem parênteses)
        // Exemplo: "...RECOMPENSA.O CORONEL QOPM..."
        const padraoSegundaOcorrencia = /^(.*?)(O\s+(?:CORONEL|TENENTE\s+CORONEL|MAJOR|CAPITÃO|1º\s+TENENTE|2º\s+TENENTE|SUBTENENTE|1º\s+SARGENTO|2º\s+SARGENTO|3º\s+SARGENTO|CABO|SOLDADO).*?)$/i;
        let match = textoLimpo.match(padraoSegundaOcorrencia);
        
        if (match && match[1].includes('ESTÁ AUTORIZADO')) {
            return { 
                primeiraParte: match[1].trim(),
                segundaParte: match[2].trim()
            };
        }
        
        // Estratégia 2: Dividir pela repetição de EXERCÍCIO
        const padraoExercicioDuplicado = /(.*?EXERCÍCIO:\s*\d{4}[^E]*)(.*EXERCÍCIO:\s*\d{4}.*)/i;
        match = textoLimpo.match(padraoExercicioDuplicado);
        
        if (match) {
            return { 
                primeiraParte: match[1].trim(),
                segundaParte: match[2].trim()
            };
        }
        
        // Estratégia 3: Dividir por ponto seguido de posto
        // Exemplo: "...RECOMPENSA. O CORONEL..."
        const padraoPontoSegundaOcorrencia = /^(.*?\.\s*)(O\s+(?:CORONEL|TENENTE\s+CORONEL|MAJOR|CAPITÃO|1º\s+TENENTE|2º\s+TENENTE|SUBTENENTE|1º\s+SARGENTO|2º\s+SARGENTO|3º\s+SARGENTO|CABO|SOLDADO).*?)$/i;
        match = textoLimpo.match(padraoPontoSegundaOcorrencia);
        
        if (match && match[1].includes('ESTÁ AUTORIZADO')) {
            return { 
                primeiraParte: match[1].trim(),
                segundaParte: match[2].trim()
            };
        }
        
        // Se nada funcionar, assumir que todo o texto é uma parte só
        return { primeiraParte: textoLimpo, segundaParte: '' };
    }
    
    // Encontrar todos os blocos de registro
    const blocos = document.querySelectorAll('td[width="90%"]');
    
    let contador = 0;
    let registrosAnalisados = [];
    let registrosComDivergencia = [];
    
    console.log('\n🔍 Analisando blocos...\n');
    
    // Processar cada bloco individualmente
    blocos.forEach((bloco, index) => {
        const textoCompleto = bloco.innerHTML || bloco.outerHTML;
        
        // Verificar se é um bloco de afastamento válido
        if (!textoCompleto.includes('ESTÁ AUTORIZADO')) {
            return;
        }
        
        contador++;
        
        // Dividir o bloco em duas partes
        const { primeiraParte, segundaParte } = dividirBloco(textoCompleto);
        
        // Extrair dados da primeira parte
        const dados1 = {
            nome: extrairNome(primeiraParte),
            numeroId: extrairNumeroId(primeiraParte),
            periodo: extrairPeriodo(primeiraParte),
            totalDias: extrairTotalDias(primeiraParte),
            motivo: extrairMotivo(primeiraParte),
            exercicio: extrairExercicio(primeiraParte)
        };
        
        // Extrair dados da segunda parte
        const dados2 = {
            nome: extrairNome(segundaParte),
            numeroId: extrairNumeroId(segundaParte),
            periodo: extrairPeriodo(segundaParte),
            totalDias: extrairTotalDias(segundaParte),
            motivo: extrairMotivo(segundaParte),
            exercicio: extrairExercicio(segundaParte)
        };
        
        const assinatura = extrairAssinatura(segundaParte);
        
        // Comparar dados (apenas os que deveriam ser idênticos)
        const comparacoes = {
            nome: compararValores(dados1.nome, dados2.nome, 'Nome'),
            numeroId: compararValores(dados1.numeroId, dados2.numeroId, 'Número ID'),
            periodo: compararValores(dados1.periodo, dados2.periodo, 'Período'),
            totalDias: compararValores(dados1.totalDias, dados2.totalDias, 'Total Dias'),
            motivo: compararValores(dados1.motivo, dados2.motivo, 'Motivo'),
            exercicio: compararValores(dados1.exercicio, dados2.exercicio, 'Exercício')
        };
        
        // Verificar se há divergências REAIS
        const divergenciasReais = Object.values(comparacoes).filter(comp => !comp.igual);
        const temDivergencia = divergenciasReais.length > 0;
        
        const registro = {
            numero: contador,
            nomeCompleto: dados1.nome || dados2.nome || 'Nome não encontrado',
            assinatura: assinatura,
            temDivergencia: temDivergencia,
            qtdDivergencias: divergenciasReais.length,
            comparacoes: comparacoes,
            dados1: dados1,
            dados2: dados2,
            primeiraParte: primeiraParte,
            segundaParte: segundaParte
        };
        
        registrosAnalisados.push(registro);
        
        if (temDivergencia) {
            registrosComDivergencia.push(registro);
        }
        
        // Log apenas se houver divergências reais
        if (temDivergencia) {
            console.log(`📋 Registro ${contador}:`);
            console.log(`   👤 Nome: ${registro.nomeCompleto}`);
            console.log(`   ✍️ Assinatura: ${assinatura}`);
            console.log(`   📊 Status: ❌ COM DIVERGÊNCIAS REAIS`);
            console.log(`   🚨 Divergências encontradas (${divergenciasReais.length}):`);
            divergenciasReais.forEach(div => {
                console.log(`      ⚠️ ${div.observacao}`);
            });
            
            // Debug adicional para nomes quando há divergência
            if (!comparacoes.nome.igual) {
                console.log(`   🔍 DEBUG Nome:`);
                console.log(`      Primeira parte original: "${dados1.nome}"`);
                console.log(`      Segunda parte original: "${dados2.nome}"`);
                
                // Mostrar como ficam após normalização
                if (dados1.nome && dados2.nome) {
                    function debugNormalizar(nome) {
                        return nome
                            // Primeiro normalizar variações de soldado
                            .replace(/SOLDADO\s+DE\s+2[ªº°]\s+CLASSE/gi, 'SOLDADO')
                            .replace(/SOLDADO\s+2[ªº°]\s+CLASSE/gi, 'SOLDADO')
                            .replace(/\b(CORONEL|TENENTE\s+CORONEL|MAJOR|CAPITÃO|1º\s+TENENTE|2º\s+TENENTE|SUBTENENTE|1º\s+SARGENTO|2º\s+SARGENTO|3º\s+SARGENTO|CABO|SOLDADO)\s+PM\b/gi, '$1')
                            .replace(/\bQOPM\b/gi, '')
                            .replace(/\bQPPM\b/gi, '')
                            .replace(/\bQOA\b/gi, '')
                            .replace(/\bQOAPM\b/gi, '')
                            .replace(/\bQOSPM\b/gi, '')
                            .replace(/\s+RG\.?\*?\d*\s+/gi, ' ')
                            .replace(/\s+REF\.?\s+/gi, ' ')
                            .replace(/\s+R\/R\s+/gi, ' ')
                            .replace(/\*\d+(?:\.\d+)?\*/g, '')
                            .replace(/X\d+X/g, '')
                            .replace(/\s+\d+\s+/g, ' ')
                            .replace(/&nbsp;/g, ' ')
                            .replace(/Ã/g, 'A').replace(/Õ/g, 'O').replace(/Â/g, 'A').replace(/Ê/g, 'E').replace(/Î/g, 'I').replace(/Ô/g, 'O').replace(/Û/g, 'U')
                            .replace(/À/g, 'A').replace(/È/g, 'E').replace(/Ì/g, 'I').replace(/Ò/g, 'O').replace(/Ù/g, 'U')
                            .replace(/Á/g, 'A').replace(/É/g, 'E').replace(/Í/g, 'I').replace(/Ó/g, 'O').replace(/Ú/g, 'U').replace(/Ç/g, 'C')
                            .replace(/\s+/g, ' ')
                            .trim()
                            .toUpperCase();
                    }
                    
                    const nome1Norm = debugNormalizar(dados1.nome);
                    const nome2Norm = debugNormalizar(dados2.nome);
                    console.log(`      Primeira parte normalizada: "${nome1Norm}"`);
                    console.log(`      Segunda parte normalizada: "${nome2Norm}"`);
                    console.log(`      São iguais após normalização: ${nome1Norm === nome2Norm}`);
                    
                    // Verificar se a diferença é apenas no posto
                    const semPosto1 = nome1Norm.replace(/^(CORONEL|TENENTE\s+CORONEL|MAJOR|CAPITÃO|1º\s+TENENTE|2º\s+TENENTE|SUBTENENTE|1º\s+SARGENTO|2º\s+SARGENTO|3º\s+SARGENTO|CABO|SOLDADO|PM)\s+/i, '').trim();
                    const semPosto2 = nome2Norm.replace(/^(CORONEL|TENENTE\s+CORONEL|MAJOR|CAPITÃO|1º\s+TENENTE|2º\s+TENENTE|SUBTENENTE|1º\s+SARGENTO|2º\s+SARGENTO|3º\s+SARGENTO|CABO|SOLDADO|PM)\s+/i, '').trim();
                    console.log(`      Sem posto/graduação: "${semPosto1}" vs "${semPosto2}"`);
                    console.log(`      Nomes sem posto são iguais: ${semPosto1 === semPosto2}`);
                }
            }
            
            // Debug adicional para períodos quando há divergência
            if (!comparacoes.periodo.igual) {
                console.log(`   🔍 DEBUG Período:`);
                console.log(`      Primeira parte: "${dados1.periodo}"`);
                console.log(`      Segunda parte: "${dados2.periodo}"`);
                console.log(`      Primeira parte original: "${primeiraParte.substring(0, 200)}..."`);
                console.log(`      Segunda parte original: "${segundaParte.substring(0, 200)}..."`);
            }
            
            // Debug adicional para total de dias quando há divergência
            if (!comparacoes.totalDias.igual) {
                console.log(`   🔍 DEBUG Total Dias:`);
                console.log(`      Primeira parte: ${dados1.totalDias} dias`);
                console.log(`      Segunda parte: ${dados2.totalDias} dias`);
                
                // Mostrar texto original que foi capturado
                const regex1 = /(?:PERFAZENDO O TOTAL DE|NUM TOTAL DE|TOTAL DE)\s+\d+[^.]*(?:DIA|MES)/gi;
                const match1 = primeiraParte.match(regex1);
                const match2 = segundaParte.match(regex1);
                
                if (match1) console.log(`      Texto original parte 1: "${match1[0]}"`);
                if (match2) console.log(`      Texto original parte 2: "${match2[0]}"`);
                
                // Explicar conversões se houver
                if (match1 && /MES/i.test(match1[0])) {
                    const meses1 = parseInt(match1[0].match(/\d+/)[0]);
                    console.log(`      → Convertido: ${meses1} meses = ${Math.round(meses1 * 30.4)} dias`);
                }
                if (match2 && /MES/i.test(match2[0])) {
                    const meses2 = parseInt(match2[0].match(/\d+/)[0]);
                    console.log(`      → Convertido: ${meses2} meses = ${Math.round(meses2 * 30.4)} dias`);
                }
            }
            
            // Debug adicional para números ID quando há divergência
            if (!comparacoes.numeroId.igual) {
                console.log(`   🔍 DEBUG Número ID:`);
                console.log(`      Primeira parte: "${dados1.numeroId}"`);
                console.log(`      Segunda parte: "${dados2.numeroId}"`);
                
                // Mostrar texto original que foi capturado
                const regexId = /\*[^*]*\*/g;
                const matchId1 = primeiraParte.match(regexId);
                const matchId2 = segundaParte.match(regexId);
                
                if (matchId1) console.log(`      Texto original parte 1: ${matchId1.join(', ')}`);
                if (matchId2) console.log(`      Texto original parte 2: ${matchId2.join(', ')}`);
                
                // Verificar se há censura
                if (matchId1 && matchId1.some(m => m.includes('*') && m.match(/\d/))) {
                    console.log(`      → Possível número censurado detectado na parte 1`);
                }
                if (matchId2 && matchId2.some(m => m.includes('*') && m.match(/\d/))) {
                    console.log(`      → Possível número censurado detectado na parte 2`);
                }
            }
            
            // Debug adicional para motivos quando há divergência
            if (!comparacoes.motivo.igual) {
                console.log(`   🔍 DEBUG Motivo:`);
                console.log(`      Primeira parte: "${dados1.motivo}"`);
                console.log(`      Segunda parte: "${dados2.motivo}"`);
                
                // Mostrar texto original capturado
                const regexMotivo = /MOTIVO:\s+[^.]+?(?:\.|EXERCÍCIO|COM\s+PERÍODO|DEVENDO|CONFORME|$)/gi;
                const matchMotivo1 = primeiraParte.match(regexMotivo);
                const matchMotivo2 = segundaParte.match(regexMotivo);
                
                if (matchMotivo1) console.log(`      Texto original parte 1: "${matchMotivo1[0]}"`);
                if (matchMotivo2) console.log(`      Texto original parte 2: "${matchMotivo2[0]}"`);
                
                // Mostrar motivo base extraído
                function extrairMotivoBaseDebug(texto, motivoOriginal) {
                    if (!motivoOriginal) return '';
                    
                    // Primeiro, verificar se há processamento de parênteses
                    const motivoParenteses = motivoOriginal.match(/\(([^)]+)\)/);
                    let motivoProcessado = motivoOriginal;
                    
                    if (motivoParenteses) {
                        const motivoGeral = motivoOriginal.replace(/\s*\([^)]*\)/, '').trim();
                        const motivoEspecifico = motivoParenteses[1].trim();
                        
                        console.log(`      → Motivo geral: "${motivoGeral}"`);
                        console.log(`      → Motivo específico (parênteses): "${motivoEspecifico}"`);
                        
                        if (motivoGeral.includes('INTERESSE DO SERVIÇO') && 
                            (motivoEspecifico.includes('RECONCESSÃO') || 
                             motivoEspecifico.includes('FÉRIAS') ||
                             motivoEspecifico.includes('RECOMPENSA'))) {
                            motivoProcessado = motivoEspecifico;
                            console.log(`      → Usando motivo específico dos parênteses`);
                        } else {
                            motivoProcessado = motivoGeral;
                            console.log(`      → Usando motivo geral (removendo parênteses)`);
                        }
                    }
                    
                    return motivoProcessado.toString().toUpperCase()
                        .replace(/\s*\([^)]*\)/g, '')
                        .replace(/,.*$/g, '')
                        .replace(/\s+CONFORME.*$/gi, '')
                        .replace(/\s+SEGUNDO.*$/gi, '')
                        .replace(/\s+DE\s+ACORDO.*$/gi, '')
                        .replace(/\s+/g, ' ')
                        .trim();
                }
                
                const motivoBase1 = extrairMotivoBaseDebug(primeiraParte, dados1.motivo);
                const motivoBase2 = extrairMotivoBaseDebug(segundaParte, dados2.motivo);
                console.log(`      Motivo base parte 1: "${motivoBase1}"`);
                console.log(`      Motivo base parte 2: "${motivoBase2}"`);
                console.log(`      Motivos base são iguais: ${motivoBase1 === motivoBase2}`);
            }
            
            console.log('   ─────────────────────────────────');
        }
    });
    
    // Resumo final
    console.log('\n📊 RESUMO DA ANÁLISE:');
    console.log(`📈 Total de registros analisados: ${registrosAnalisados.length}`);
    
    const consistentes = registrosAnalisados.filter(r => !r.temDivergencia);
    const inconsistentes = registrosAnalisados.filter(r => r.temDivergencia);
    
    console.log(`✅ Registros consistentes: ${consistentes.length}`);
    console.log(`❌ Registros com divergências REAIS: ${inconsistentes.length}`);
    
    // Calcular taxa de consistência
    if (registrosAnalisados.length > 0) {
        const percentualConsistencia = ((consistentes.length / registrosAnalisados.length) * 100).toFixed(1);
        console.log(`📊 Taxa de consistência: ${percentualConsistencia}%`);
    }
    
    // Análise por tipo de divergência
    if (inconsistentes.length > 0) {
        console.log('\n📊 ANÁLISE POR TIPO DE DIVERGÊNCIA:');
        
        const tiposDivergencia = ['nome', 'numeroId', 'periodo', 'totalDias', 'motivo', 'exercicio'];
        tiposDivergencia.forEach(tipo => {
            const count = inconsistentes.filter(r => !r.comparacoes[tipo].igual).length;
            if (count > 0) {
                console.log(`   🔍 ${tipo}: ${count} divergência(s)`);
            }
        });
        
        // Detalhar apenas divergências reais
        console.log('\n🚨 DETALHES DAS DIVERGÊNCIAS REAIS:');
        inconsistentes.forEach(registro => {
            console.log(`\n   ${registro.numero}. ${registro.nomeCompleto} (${registro.assinatura})`);
            console.log(`      📋 ${registro.qtdDivergencias} divergência(s) encontrada(s):`);
            
            Object.entries(registro.comparacoes).forEach(([campo, comp]) => {
                if (!comp.igual) {
                    console.log(`         ⚠️ ${comp.observacao}`);
                }
            });
        });
    } else {
        console.log('\n✅ Nenhuma divergência real encontrada! Todos os registros estão consistentes.');
    }
    
    // Tabela resumo apenas de problemas
    if (inconsistentes.length > 0) {
        console.log('\n📋 TABELA DE PROBLEMAS:');
        console.table(inconsistentes.map(r => ({
            'Nº': r.numero,
            'Nome': r.nomeCompleto.length > 40 ? r.nomeCompleto.substring(0, 40) + '...' : r.nomeCompleto,
            'Qtd Problemas': r.qtdDivergencias,
            'Assinatura': r.assinatura
        })));
    }
    
    // Retornar dados para uso posterior se necessário
    return {
        total: registrosAnalisados.length,
        consistentes: consistentes.length,
        inconsistentes: inconsistentes.length,
        registrosComDivergencia: registrosComDivergencia,
        todosRegistros: registrosAnalisados
    };
})();
# Healthcare

Status: referencia regulatoria e de contexto. Este documento nao substitui parecer juridico, medico ou regulatorio.

## Tema

Referencias gerais de saude digital, telessaude e telemedicina aplicaveis ao MedSync.

## Fonte

- Lei nº 14.510/2022 - autoriza e disciplina a pratica da telessaude no Brasil: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/L14510.htm
- Resolucao CFM nº 2.314/2022 - define e regulamenta telemedicina: https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2022/2314_2022.pdf
- Lei nº 13.709/2018 - LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm

## Observacoes

- Telessaude e telemedicina possuem escopos diferentes; telemedicina e especifica para atos medicos.
- O MedSync deve manter separacao entre atendimento clinico, operacao administrativa, pagamentos e relatorios B2B.
- O status documental atual permanece homologacao controlada.
- Qualquer uso assistencial real depende de validacoes tecnica, juridica, privacidade, seguranca e diretor tecnico.

## Impacto para produto

- [Product Vision](../01-product/PRODUCT_VISION.md) deve preservar a cautela regulatoria.
- [B2B Model](../01-product/B2B_MODEL.md) deve impedir acesso empresarial a dado clinico individual.
- [Roadmap](../01-product/ROADMAP.md) deve manter go-live condicionado a aprovacoes.

## TODO

- TODO: definir checklist regulatorio por modalidade de atendimento.
- TODO: confirmar responsabilidades de medico independente, ADM Medico do Trabalho, plataforma, CNPJ tecnico e empresa.
- TODO: mapear requisitos para termos, prontuario, documentos medicos e auditoria.

# Relatório de correções — Projeto RotaFit

**Disciplina:** Programação para Dispositivos Móveis — IESB
**Professor:** Prof. Me. Bruno Assunção Dias
**Aluno:** Natan Sauer
**Data:** 05/11/2026
**Ferramenta de IA utilizada:** Claude (Anthropic), modelo Claude Opus 5.5, no app Claude

## 1. Objetivo e método

Construir o RotaFit seguindo o *Guia passo a passo* (Etapas 1 a 16) e registrar
todos os problemas encontrados no caminho, o que foi pedido à IA, o que ela
respondeu e como cada correção foi implementada.

O código do guia foi transcrito arquivo por arquivo e revisado com apoio da IA.
Cada problema encontrado recebeu um identificador (C01, C02...) e um comentário
`// CORREÇÃO:` no próprio código-fonte, para ser localizado com uma busca
(`grep -rn "CORREÇÃO" app src supabase`).

## 2. Prompt utilizado

Prompt enviado à IA, junto com o PDF do guia anexado:

> Vamos desenvolver esse projeto RotaFit, referente a disciplina programação
> para dispositivos moveis. Instruções do professor: Projeto RotaFit - React
> Native. Criar um relatórios com todas as soluções de correção que foram
> apresentados durante o desenvolvimento do projeto, como erros, prompts
> utilizados, respostas das IAs e como foi implementado a solução para seguir
> com o projeto. Enviar o diretório do projeto funcional. Informações
> adicionais: minha conta no Spotify é Premium. Quero o projeto funcional.

**Resposta da IA (resumo):** a IA montou o projeto completo a partir do guia,
leu cada arquivo procurando erros de compilação, de lógica, de interface e de
configuração, corrigiu os que encontrou, executou os testes automatizados que o
ambiente permitia e escreveu este relatório. A IA também pesquisou mudanças
recentes nas plataformas usadas (Expo SDK 55/56 e regras do Spotify de
fevereiro de 2026), porque o guia foi escrito antes delas.

Nas seções 3 a 8, cada item traz: **Problema** (o erro ou sintoma),
**Diagnóstico da IA** (a resposta/explicação dada) e **Solução implementada**.

## 3. Arquivos que o guia cita mas não traz

### C01 — `src/lib/queryClient.ts` inexistente
- **Problema:** `AuthContext.tsx` e `app/_layout.tsx` importam `@/lib/queryClient`, mas o guia nunca mostra esse arquivo. Erro esperado: *Unable to resolve module @/lib/queryClient*.
- **Diagnóstico da IA:** o arquivo vem dos projetos anteriores da série e foi omitido. Precisa exportar uma única instância de `QueryClient`.
- **Solução:** criado `src/lib/queryClient.ts` com `retry: 1`, `staleTime: 30s` e sem refetch ao focar.

### C02 — `src/utils/errors.ts` (`friendlyError`) inexistente
- **Problema:** cinco telas importam `friendlyError`, que não existe no guia.
- **Diagnóstico da IA:** além de faltar, a função precisa lidar com erros que *não* são `Error` — o `PostgrestError` do Supabase é um objeto simples com `message`.
- **Solução:** criada a função, que aceita `Error`, objetos com `message` e strings, e traduz falha de rede, violação de RLS, sessão expirada e "Premium required" do Spotify para mensagens em português.

### C03 — `src/utils/icons.ts` (`IconName`) inexistente
- **Problema:** `StateViews.tsx` e o layout das abas importam o tipo `IconName`.
- **Solução:** `export type IconName = ComponentProps<typeof Ionicons>['name']` — o TypeScript passa a recusar nomes de ícone inválidos.

### C04 — `money.test.ts` citado, mas sem código
- **Problema:** a Etapa 15 diz que os 37 testes incluem "dinheiro herdado da base", mas o RotaFit não tem nenhum código de dinheiro (sobra do projeto FinTrack). Com o guia, a conta não fecha: 28 + 2 = 30 testes, não 37.
- **Solução:** criado `__tests__/errors.test.ts` com 7 testes de `friendlyError`, totalizando os **37 testes do app** prometidos (15 geo + 13 tracker + 2 saudação + 7 erros).

### C05 — Pasta `src/schemas` vazia
- **Problema:** criada na Etapa 2.5 e nunca usada.
- **Solução:** removida.

## 4. Configuração e plataforma

### C06 — Versão do Expo × Expo Go do celular
- **Problema:** `create-expo-app@latest` instala o SDK mais novo, mas o Expo Go das lojas pode estar em outro SDK. Sintoma: *"Project is incompatible with this version of Expo Go"*.
- **Diagnóstico da IA:** pesquisa nas notas oficiais mostrou que o SDK 55 (fev/2026) e o SDK 56 (mai/2026) não chegaram às lojas no lançamento; o modelo padrão continuou no SDK 54. O SDK 56 também tirou `@expo/vector-icons` das dependências do pacote `expo`.
- **Solução:** `package.json` fixado no SDK 54 (o do guia), com `@expo/vector-icons` declarado explicitamente. O README explica como alinhar ao SDK do Expo Go instalado (`npx expo install expo@latest` + `npx expo install --fix`) ou usar um build de desenvolvimento.

### C07 — Redirect do login Google não funciona no Expo Go
- **Problema:** o guia manda cadastrar só `rotafit://` no Supabase. No Expo Go, `makeRedirectUri` devolve `exp://SEU-IP:8081/--/`, e não `rotafit://`. Sintoma: depois do login o navegador abre o *Site URL* do Supabase (ou `localhost`) em vez de voltar ao app.
- **Diagnóstico da IA:** o esquema `rotafit://` só existe num build nativo; o Expo Go usa o próprio esquema `exp://`. O Supabase só redireciona para URLs da lista permitida.
- **Solução:** cadastrar também `exp://**` (e `rotafit://**`) em *Redirect URLs*; o app imprime no terminal a URL exata usada (`[RotaFit] Redirect do login Google: ...`).

### C08 — Redirect do Spotify no Expo Go e regras de 2026
- **Problema:** o Spotify exige que o Redirect URI seja **idêntico** ao cadastrado. No Expo Go o valor é `exp://SEU-IP:8081/--/spotify-auth`, não `rotafit://spotify-auth`. Sintoma: página do Spotify com *"INVALID_CLIENT: Invalid redirect URI"*.
- **Diagnóstico da IA:** além disso, desde fevereiro de 2026 apps em modo de desenvolvimento exigem que o **dono do app tenha Premium** e permitem até 5 usuários. Os endpoints de player usados no projeto não foram removidos. Como a conta do aluno é Premium, o controle de reprodução funciona.
- **Solução:** o Redirect URI em uso aparece na tela **Perfil** (em modo de desenvolvimento) e no terminal, para ser copiado ao painel do Spotify. O README lista os dois URIs a cadastrar.

### C09 — Permissão de localização "sempre"
- **Problema:** o guia usa a opção `locationAlwaysAndWhenInUsePermission` no plugin, que prepara a permissão "sempre" (segundo plano), mas o app só usa a localização com a tela aberta. As lojas questionam pedidos de "sempre" sem uso real.
- **Solução:** trocada por `locationWhenInUsePermission`. Também foram registrados os plugins `expo-secure-store` e `expo-web-browser`.

## 5. Banco de dados (Supabase)

### C10 — Privilégios padrão do Supabase para `anon`
- **Problema:** no Supabase real, todo objeto novo do schema `public` já recebe `ALL` (tabelas) e `EXECUTE` (funções) para `anon` e `authenticated`. O `revoke ... from public` do guia **não** remove esses direitos, e o teste "visitante não executa a função" passava no PGlite só porque o ambiente de teste não tinha esses privilégios.
- **Diagnóstico da IA:** o RLS ainda impede que o visitante veja dados, mas o teste não refletia a realidade e `anon` podia chamar `weekly_stats`.
- **Solução:** `schema.sql` revoga explicitamente de `anon` (tabela e função) e deixa para `authenticated` só `select, insert, delete`. O teste do banco passou a recriar os privilégios padrão do Supabase, então agora ele detecta esse erro de verdade.

### C11 — Semana começando no horário errado
- **Problema:** `date_trunc('week', now())` usa o fuso da sessão (UTC no Supabase): a "semana" começava domingo às 21h no horário de Brasília.
- **Solução:** cálculo feito em `America/Sao_Paulo`, com início na segunda-feira 00h.

### C12 — Função sem `search_path` fixo
- **Problema:** o *Security Advisor* do Supabase alerta "Function Search Path Mutable" para funções sem `search_path` definido.
- **Solução:** `set search_path = public` na função.

### C13 — Ritmo médio estourando a coluna
- **Problema:** `avg_pace_sec_per_km` é `numeric(8,2)` (máx. 999.999,99). Uma corrida com distância quase nula (ruído de GPS de centímetros em vários minutos) gera ritmo gigante e o insert falha com *numeric field overflow*.
- **Solução:** `saveRun` grava `null` quando o ritmo é inválido ou passa do limite.

## 6. Lógica da corrida (GPS)

### C14 — Tempo pausado contado ao finalizar a partir da pausa
- **Problema:** em `useRunTracker.finish()`, o guia montava o estado final com `status: 'finished'` **sem** somar a pausa em andamento. Resultado: quem pausava e depois finalizava tinha o tempo parado contado como corrida (duração e ritmo errados no banco).
- **Diagnóstico da IA:** o reducer testado faz a conta certa no `FINISH`, mas o hook não o usava para calcular a duração.
- **Solução:** a duração é calculada com `trackerReducer(state, { type: 'FINISH' })`, a mesma função coberta pelos testes.

### C15 — Duração zero recusada pelo banco
- **Problema:** corridas com menos de 0,5 s arredondavam para 0 e o `check (duration_seconds > 0)` recusava o insert.
- **Solução:** duração mínima de 1 segundo ao salvar.

### C16 — Ritmo exibido como `5'60"/km`
- **Problema:** `formatPace` arredondava os segundos separadamente; 359,6 s/km virava `5'60"/km`.
- **Solução:** arredonda o total antes de separar minuto e segundo. Novo caso no teste: `formatPace(359.6) === 6'00"/km`.

### C17 — Primeiro ponto com tempo negativo
- **Problema:** o horário do GPS (`loc.timestamp`) pode ser anterior ao `Date.now()` do início (leitura em cache), gerando `t` negativo.
- **Solução:** `t = Math.max(0, now - startedAt)` no reducer.

### C18 — Escuta do GPS duplicada ou "vazando" ao pausar
- **Problema:** se o usuário pausasse enquanto `watchPositionAsync` ainda estava resolvendo, a inscrição chegava depois e ficava ativa (gasto de bateria, pontos ignorados). Retomar duas vezes criava duas inscrições.
- **Solução:** controle por "geração": inscrições atrasadas são descartadas, e `startWatching` sempre encerra a anterior.

### C19 — Tela presa em "Localizando..." com o GPS desligado
- **Problema:** com a localização do aparelho desligada, `watchPositionAsync` lança exceção não tratada.
- **Solução:** `start()` verifica `hasServicesEnabledAsync()`, captura erros e devolve o motivo (`permission`, `services-off`, `error`); a tela mostra o alerta adequado e oferece "Abrir configurações".

### C20 — Corrida perdida pelo botão Voltar ou por falha ao salvar
- **Problema:** o botão Voltar do Android e o gesto de voltar do iOS saíam da corrida sem confirmação. Se o salvamento falhasse (sem internet), a corrida se perdia.
- **Solução:** gesto desativado na tela de corrida; Voltar do Android pede confirmação de descarte; erro ao salvar oferece "Tentar de novo" com os mesmos dados; tela intermediária "Salvando corrida...".

## 7. Interface (Liquid Glass e telas)

### C21 — Layout quebrado dentro dos cartões de vidro
- **Problema:** o `GlassSurface` do guia envolvia o conteúdo numa `View` extra. Estilos como `flexDirection: 'row'` e `gap` do cartão eram aplicados à `View` de fora e não aos filhos. Sintoma: no resumo, o ícone de música ficava **acima** do nome da faixa, e o `gap` entre itens do cartão não funcionava.
- **Solução:** os filhos passam a ser renderizados direto na superfície (as camadas de vidro são absolutas e não interferem).

### C22 — "Glow" dos botões invisível no iOS
- **Problema:** a sombra colorida era aplicada na mesma `View` com `overflow: 'hidden'`, que no iOS corta a sombra.
- **Solução:** nova prop `glow` no `GlassSurface`, que coloca a sombra num invólucro externo sem `overflow: 'hidden'`.

### C23 — Abas com fundo branco no tema escuro
- **Problema:** as telas das abas usavam o fundo padrão do React Navigation (branco).
- **Solução:** `sceneStyle: { backgroundColor: theme.background }` nas abas e fundo do tema na raiz.

### C24 — Telas sem área segura e sem fundo em degradê
- **Problema:** Início, Histórico, Perfil e Corrida não usavam `<Screen>`: texto sob o *notch* e sem o degradê que dá sentido ao vidro. Na corrida, em celulares pequenos os botões saíam da tela.
- **Solução:** `<Screen>` nas abas; na corrida, área segura e `ScrollView`.

### C25 — Foto do Google nunca exibida no Perfil
- **Problema:** o guia importava `Image` e lia `avatar_url`, mas sempre mostrava a inicial.
- **Solução:** exibe a foto quando existe (`avatar_url` ou `picture`).

### C26 — Traçado da rota sumindo ou deformado
- **Problema:** (a) com o gradiente em `objectBoundingBox` (padrão), uma rota perfeitamente reta tem caixa de altura zero e o traço some; (b) id fixo `trail` repetido entre instâncias; (c) longitude sem correção pela latitude deixa o desenho esticado.
- **Solução:** `gradientUnits="userSpaceOnUse"`, id único com `useId()` e fator `cos(latitude)` na escala horizontal.

### C27 — Vidro sobre vidro no resumo
- **Problema:** o resumo colocava o `RoutePath` (que já é vidro) dentro de um `Card` de vidro: borda e brilho duplicados.
- **Solução:** removido o `Card` externo.

### C28 — Erros do Spotify invisíveis
- **Problema:** o guia diz que erros como "nenhum dispositivo ativo" aparecem para o usuário, mas o `SpotifyPlayerCard` nunca os exibia — o toque simplesmente não fazia nada.
- **Solução:** o cartão mostra o erro de conexão, de consulta e dos controles, e desabilita os botões enquanto um comando está em andamento.

### C29 — Telas de estado transparentes
- **Problema:** `LoadingView` e `ErrorState` não tinham fundo; fora de `<Screen>` apareciam sobre branco no tema escuro.
- **Solução:** fundo do tema aplicado.

## 8. Login, Spotify e dados

### C30 — Import de caminho interno do `expo-auth-session`
- **Problema:** `import ... from 'expo-auth-session/build/QueryParams'` usa um arquivo interno do pacote, que não faz parte da API pública e pode quebrar numa atualização.
- **Solução:** função própria `parseAuthParams` lê a query (`?code=`) e o fragmento (`#access_token=`) da URL de retorno. Também trata o fluxo PKCE, caso o projeto Supabase o use.

### C31 — App travado no carregamento
- **Problema:** se `getSession()` falhasse (token salvo inválido), `loading` nunca virava `false`.
- **Solução:** `.catch` e `.finally` em `AuthContext`.

### C32 — Troca do código do Spotify feita duas vezes
- **Problema:** o efeito que troca o `code` por tokens dependia de `request`; ao recriar o pedido, o mesmo código era trocado de novo (*invalid_grant*). Falhas na troca viravam *unhandled promise rejection*.
- **Solução:** guarda o código já tratado numa `ref`, trata erros e mostra a mensagem; avisa se o `EXPO_PUBLIC_SPOTIFY_CLIENT_ID` estiver vazio.

### C33 — "JSON Parse error" nos comandos do player
- **Problema:** alguns comandos do player respondem 200 com corpo vazio; o guia chamava `res.json()` direto.
- **Solução:** lê o corpo como texto e só converte se houver conteúdo; mensagens específicas para 401, 403 (Premium) e 429. `currently-playing` passou a aceitar podcasts (`additional_types=track,episode`).

### C34 — Cache misturando contas e erro após excluir
- **Problema:** as chaves do TanStack Query não incluíam o usuário; e, ao excluir, a invalidação recarregava o resumo da corrida apagada, que piscava um erro *"no rows returned"*.
- **Solução:** chaves com `user.id`; a invalidação pula a consulta da corrida excluída.

### C35 — Histórico baixando a rota inteira de todas as corridas
- **Problema:** a lista pedia `select('*')`, incluindo até 200 pontos por corrida, sem usar.
- **Solução:** a lista pede só as colunas exibidas; a rota vem no resumo.

## 9. Verificação

| Verificação | Resultado |
|---|---|
| 37 testes do app (geo, tracker, saudação, erros) | **37/37 passando** |
| 11 testes do banco (PGlite) | Rodados no computador do aluno pelo `1-instalar.bat` |
| Login com Google no celular (Expo Go, Android) | Funcionando |
| Corrida real com GPS, salva e exibida no histórico | Funcionando (687 m, traçado e ritmo corretos) |
| Spotify: conexão, música tocando e controles | Funcionando (conta Premium) |
| Tema claro e escuro | Funcionando — capturas em `docs/screenshots/` |

## 10. Prompts para erros que surgirem no teste no aparelho

Se algum erro aparecer ao rodar no celular, use um destes prompts e registre a
resposta na tabela da seção 11.

| Situação | Prompt sugerido |
|---|---|
| Erro vermelho no Expo Go | "No RotaFit (Expo SDK 54, Expo Router), ao abrir a tela X aparece este erro: [cole o erro completo]. O arquivo é: [cole o arquivo]. Qual a causa e a correção?" |
| Login Google não volta ao app | "O login com Google pelo Supabase abre o navegador mas não volta ao app no Expo Go. O terminal mostra o redirect [cole]. As Redirect URLs do Supabase são [liste]. O que está errado?" |
| Spotify recusa login | "Ao conectar o Spotify aparece INVALID_CLIENT: Invalid redirect URI. O Perfil mostra [cole o URI] e no painel do Spotify cadastrei [liste]." |
| Teste falhando | "O comando npm test falha com esta saída: [cole]. Explique a causa e corrija sem mudar o objetivo do teste." |

## 11. Problemas encontrados nos testes no aparelho

Erros que apareceram ao rodar o projeto no computador (Windows) e no celular
(Android, Expo Go). O "prompt" foi o print da tela enviado à IA com uma frase.

| # | Problema | Prompt usado | Resposta da IA | Solução aplicada |
|---|---|---|---|---|
| C36 | `1-instalar.bat`: "[ERRO] Node.js nao encontrado" | Print do cmd: "ao clicar no bat instalar" | O Node.js não estava instalado; o Expo e o npm dependem dele, e o script detectou isso antes de instalar | Instalado o Node.js LTS; janela reaberta e script executado de novo |
| C37 | Expo Go: "Project is incompatible with this version of Expo Go" (Expo Go SDK 58, projeto SDK 54) | Print: "funcionou, mas o que é melhor fazer agora?" | Confirma o C06. Subir o projeto 4 versões de SDK traria mudanças que quebram código; no Android dá para instalar o Expo Go do SDK 54 | Expo Go do SDK 54 instalado por expo.dev/go |
| C38 | Expo Go: "Failed to download remote update" | Print da tela | O celular caiu do Wi-Fi para o 5G e não alcançava o computador; outra causa possível é o Firewall do Windows | Celular de volta ao Wi-Fi; criado `3-iniciar-tunel.bat` (`npx expo start --tunnel`) |
| C39 | Após o login do Google, o navegador abriu `localhost:3000` | Print: "deu isso depois da autenticação do google" | `localhost:3000` é o Site URL padrão do Supabase, usado quando o endereço de volta não está nas Redirect URLs | Ao reabrir o app o login funcionou; se repetir, cadastrar a URL exata que o app imprime no terminal |
| C40 | Spotify: "redirect_uri: Not matching configuration" | Print: "devo recomeçar a sessão ou solucionar isso?" | No Expo Go o app usa `exp://.../--/spotify-auth`, e só `rotafit://spotify-auth` estava cadastrado. Reiniciar não resolve | Redirect URI mostrado no Perfil cadastrado no painel do Spotify |
| C41 | Depois de autorizar o Spotify: "Unmatched Route — Page could not be found" | Print: "ainda não consegui conectar o Spotify" | O Spotify devolve o app em `/spotify-auth`, e o Expo Router procura uma tela com esse nome, que o guia não cria | Criada `app/spotify-auth.tsx`, que redireciona ao Perfil |
| C42 | Tema claro: botões vermelhos com o lado esquerdo rosa/desbotado | Capturas de tela enviadas para o portfólio (a IA notou o defeito nelas) | O brilho do vidro (branco 75%) cobria a cor sólida do botão | Brilho reduzido a 16% em superfícies quase opacas, no `GlassSurface` |

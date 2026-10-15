package main

import (
	"bytes"
	"fmt"
	"os"
	"regexp"
	"strings"
	htmpl "html/template"
	ttmpl "text/template"
)

type R interface{ Execute(w *bytes.Buffer, d interface{}) error }

func render(kind, src string, data map[string]interface{}) (string, error) {
	var b bytes.Buffer
	if kind == "text" {
		t, err := ttmpl.New("x").Parse(src)
		if err != nil {
			return "", err
		}
		err = t.Execute(&b, data)
		return b.String(), err
	}
	t, err := htmpl.New("x").Parse(src)
	if err != nil {
		return "", err
	}
	err = t.Execute(&b, data)
	return b.String(), err
}

func main() {
	root := os.Args[1]
	files := []string{"confirmar-conta.html", "magic-link.html", "redefinir-senha.html", "trocar-email.html"}
	base := map[string]interface{}{"Token": "123456", "TokenHash": "abcHASH", "Email": "a@b.com", "NewEmail": "n@b.com"}
	cases := []struct {
		name string
		data interface{}
	}{
		{"Data ausente (nil)", nil},
		{"Data vazio", map[string]interface{}{}},
		{"ui_language=pt-BR", map[string]interface{}{"ui_language": "pt-BR"}},
		{"ui_language=en", map[string]interface{}{"ui_language": "en"}},
		{"ui_language=es", map[string]interface{}{"ui_language": "es"}},
		{"outras chaves", map[string]interface{}{"full_name": "Ana"}},
	}
	fails := 0
	acc := regexp.MustCompile(`[ãõçáàâéêíóôúÀ-ÿ]`)
	words := regexp.MustCompile(`(?i)\b(você|vocês|seu|sua|código|senha|conta|até|para|não|vale|botão|entrar|ativar|criar|novo|nova|professora|idiomas|bons estudos)\b`)
	for _, kind := range []string{"html", "text"} {
		for _, f := range files {
			orig, _ := os.ReadFile(root + "/docs/email/supabase/" + f)
			bi, _ := os.ReadFile(root + "/docs/email/supabase/bilingue/" + f)
			for _, c := range cases {
				m := map[string]interface{}{}
				for k, v := range base {
					m[k] = v
				}
				if c.data != nil {
					m["Data"] = c.data
				} else {
					m["Data"] = map[string]interface{}(nil)
				}
				o, err1 := render(kind, string(orig), m)
				n, err2 := render(kind, string(bi), m)
				if err1 != nil || err2 != nil {
					fmt.Println("ERRO", kind, f, c.name, err1, err2)
					fails++
					continue
				}
				isEn := c.name == "ui_language=en"
				// remove a linha da definição e o comentário de topo da versão bilíngue
				n2 := n
				if i := strings.Index(n2, "<!doctype html>"); i >= 0 {
					n2 = n2[i:]
				}
				if !isEn {
					// o português tem de sair igual ao modelo atual (tirando só o comentário de topo, que fica depois do doctype? não)
					nn := strings.Replace(n2, "<!doctype html>", "<!doctype html>", 1)
					// o comentário bilíngue vem antes do doctype, já removido acima
					if nn != o && strings.TrimSpace(nn) != strings.TrimSpace(o) {
						// html/template escapa diferente de comentário; compara sem comentários
						re := regexp.MustCompile(`(?s)<!--.*?-->`)
						if re.ReplaceAllString(nn, "") != re.ReplaceAllString(o, "") {
							fmt.Println("DIFERE do português atual:", kind, f, c.name)
							fails++
							continue
						}
					}
					fmt.Println("ok  pt idêntico:", kind, f, "|", c.name)
				} else {
					re := regexp.MustCompile(`(?s)<!--.*?-->`)
					vis := re.ReplaceAllString(n2, "")
					vis = regexp.MustCompile(`(?s)<style.*?</style>`).ReplaceAllString(vis, "")
					vis = regexp.MustCompile(`<[^>]+>`).ReplaceAllString(vis, " ")
					if acc.MatchString(vis) || words.MatchString(vis) {
						fmt.Println("PORTUGUÊS NO EN:", kind, f, acc.FindString(vis), words.FindString(vis))
						fails++
						continue
					}
					if !strings.Contains(n2, `lang="en"`) || !strings.Contains(n2, "abcHASH") {
						fmt.Println("EN sem lang/hash", f)
						fails++
						continue
					}
					fmt.Println("ok  en sem português:", kind, f)
				}
			}
		}
	}
	fmt.Println("falhas:", fails)
	if fails > 0 {
		os.Exit(1)
	}
}

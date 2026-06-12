import Link from "next/link";

export const metadata = {
  title: "Reglas — Polla Mundial FIFA 2026",
  description: "Condiciones, premios y cómo participar en la Polla Mundial FIFA 2026",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="section-bar headline text-xl mb-4">{children}</h2>;
}

export default function ReglasPage() {
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl min-h-screen">
      <h1 className="headline text-3xl md:text-4xl mb-2">
        Guía del <span className="text-primary">Participante</span>
      </h1>
      <p className="text-muted-foreground mb-8">
        Todo lo que necesitas saber para jugar la Polla Mundial FIFA 2026.
      </p>

      {/* 1. Qué es */}
      <section className="mb-10">
        <SectionTitle>1. ¿Qué es esta polla?</SectionTitle>
        <div className="bg-card border border-border rounded-lg p-5 space-y-3 text-sm">
          <p>
            Es una competencia privada <b>entre amigos</b> de pronósticos del{" "}
            <b>Mundial FIFA 2026</b>. Cada participante paga una cuota de inscripción,
            pronostica los resultados de los partidos y acumula puntos según sus
            aciertos. Al final del Mundial, la bolsa del recaudo se reparte entre los
            mejores.
          </p>
          <p className="text-muted-foreground">
            Funciona desde el celular o el computador, sin instalar nada.
          </p>
        </div>
      </section>

      {/* 2. Cómo ingresar */}
      <section className="mb-10">
        <SectionTitle>2. Cómo ingresar</SectionTitle>
        <div className="bg-card border border-border rounded-lg p-5 text-sm">
          <ol className="list-decimal list-inside space-y-2">
            <li>Recibirás un <b>enlace de invitación</b> personal (la entrada es solo por invitación).</li>
            <li>Ábrelo y completa el registro: <b>nombre, teléfono y una contraseña</b>.</li>
            <li>Tu teléfono será tu usuario para entrar después en <b>Entrar</b>.</li>
            <li>
              Paga la <b>cuota de inscripción</b> al organizador. Tu pago queda registrado
              y con él juegas la <b>fase de grupos</b> y los pronósticos especiales.
            </li>
            <li>
              Cuando termine la fase de grupos podrás hacer una <b>recarga</b> (un segundo
              pago) para seguir pronosticando las fases finales — ver la sección 5.
            </li>
          </ol>
        </div>
      </section>

      {/* 3. Pronósticos especiales */}
      <section className="mb-10">
        <SectionTitle>3. Lo PRIMERO que debes hacer: pronósticos especiales</SectionTitle>
        <div className="bg-card border border-border rounded-lg p-5 text-sm space-y-4">
          <p>
            Apenas entres, en <b>Mi Apuesta</b> encontrarás la sección{" "}
            <b>Pronósticos especiales</b>. Debes elegirlos antes de que termine la
            primera ronda de la fase de grupos, es decir el <b>27 de junio de 2026</b>:
          </p>
          <table className="w-full">
            <thead>
              <tr className="bg-black/40 text-muted-foreground text-[11px] uppercase tracking-wider font-bold">
                <th className="p-3 text-left">Pronóstico</th>
                <th className="p-3 text-right">Puntos si aciertas</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="p-3">🏆 Campeón del Mundial</td>
                <td className="p-3 text-right font-black text-accent">30</td>
              </tr>
              <tr className="border-t border-border bg-black/20">
                <td className="p-3">🥈 Subcampeón</td>
                <td className="p-3 text-right font-black text-accent">15</td>
              </tr>
              <tr className="border-t border-border">
                <td className="p-3">⚽ Goleador del torneo</td>
                <td className="p-3 text-right font-black text-accent">20</td>
              </tr>
            </tbody>
          </table>
          <p className="bg-primary/15 border border-primary rounded p-3">
            ⚠️ Estos pronósticos <b>se bloquean el 27 de junio de 2026</b> y no se pueden
            cambiar durante el resto del Mundial. ¡No dejes pasar la fecha!
          </p>
        </div>
      </section>

      {/* 4. Cómo pronosticar */}
      <section className="mb-10">
        <SectionTitle>4. Cómo pronosticar los partidos</SectionTitle>
        <div className="bg-card border border-border rounded-lg p-5 text-sm space-y-4">
          <p>
            En <b>Mi Apuesta</b> verás los partidos organizados por fase, cada uno con
            las banderas y la fecha/hora de Colombia.
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Escribe el marcador que crees (ej: 2 - 1).</li>
            <li>Pulsa <b>Guardar</b>.</li>
            <li>
              Puedes <b>cambiar tu pronóstico las veces que quieras… hasta que el partido
              empiece</b>. En ese momento se bloquea automáticamente.
            </li>
            <li>Un partido sin pronóstico = 0 puntos seguros. ¡Pronostícalos todos!</li>
          </ol>

          <h3 className="font-black uppercase text-sm pt-2">¿Cuántos puntos gano por partido?</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-black/40 text-muted-foreground text-[11px] uppercase tracking-wider font-bold">
                  <th className="p-3 text-left">Fase</th>
                  <th className="p-3 text-right">Ganador (o empate)</th>
                  <th className="p-3 text-right">Dif. de goles</th>
                  <th className="p-3 text-right">Marcador exacto</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="p-3">Fase de grupos</td>
                  <td className="p-3 text-right font-bold">3</td>
                  <td className="p-3 text-right font-bold">+2</td>
                  <td className="p-3 text-right font-black text-accent">5</td>
                </tr>
                <tr className="border-t border-border bg-black/20">
                  <td className="p-3">Dieciseisavos y Octavos</td>
                  <td className="p-3 text-right font-bold">5</td>
                  <td className="p-3 text-right text-muted-foreground">—</td>
                  <td className="p-3 text-right font-black text-accent">8</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3">Cuartos de final</td>
                  <td className="p-3 text-right font-bold">7</td>
                  <td className="p-3 text-right text-muted-foreground">—</td>
                  <td className="p-3 text-right font-black text-accent">10</td>
                </tr>
                <tr className="border-t border-border bg-black/20">
                  <td className="p-3">Semifinales y 3er puesto</td>
                  <td className="p-3 text-right font-bold">10</td>
                  <td className="p-3 text-right text-muted-foreground">—</td>
                  <td className="p-3 text-right font-black text-accent">15</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 font-black">FINAL</td>
                  <td className="p-3 text-right font-black">15</td>
                  <td className="p-3 text-right text-muted-foreground">—</td>
                  <td className="p-3 text-right font-black text-accent">25</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground border-l-4 border-accent pl-3">
            El marcador exacto <b className="text-foreground">incluye</b> los puntos de
            ganador: ej. en grupos, si aciertas el marcador sumas 3 + 2 + 5 ={" "}
            <b className="text-accent">10 puntos</b>. Las fases finales valen más: ¡la
            final puede darte hasta 40!
          </p>
        </div>
      </section>

      {/* 5. Recarga */}
      <section className="mb-10">
        <SectionTitle>5. La RECARGA: tu apuesta para las fases finales 💪</SectionTitle>
        <div className="bg-card border border-border rounded-lg p-5 text-sm space-y-4">
          <p>
            Tu cuota de inscripción cubre la <b>fase de grupos</b>. Para seguir
            compitiendo en las <b>fases finales</b> (dieciseisavos, octavos, cuartos,
            semifinales y final) debes hacer una <b>recarga de tu apuesta</b>: un único
            pago adicional que habilita TODOS los partidos de eliminatorias hasta la final.
          </p>
          <div>
            <p className="font-black uppercase mb-2">Cómo funciona:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                Al cerrar la fase de grupos, los cruces de dieciseisavos aparecen
                automáticamente en <b>Mi Apuesta</b> como una nueva sección.
              </li>
              <li>
                Si aún no has recargado, esos partidos se ven con la marca{" "}
                <b className="text-accent">⚡ Requiere recarga</b> y la app te muestra el
                monto a pagar.
              </li>
              <li>
                Paga la recarga al organizador → él la activa → quedas habilitado para
                pronosticar todas las eliminatorias.
              </li>
            </ol>
          </div>
          <p>
            <b>¿Y si no recargo?</b> Conservas tus puntos de la fase de grupos y sigues
            apareciendo en la tabla de posiciones, pero no podrás pronosticar los
            partidos de fases finales (dejas de sumar puntos por partido). Como la
            recarga también engorda la bolsa de premios, ¡recargar conviene a todos! 🤑
          </p>
          <p className="bg-accent/10 border border-accent rounded p-3">
            📲 <b>Tu tarea en cada fase:</b> entrar a la app al inicio de la fase y
            pronosticar los nuevos partidos antes de que empiecen.
          </p>
        </div>
      </section>

      {/* 6. Posiciones */}
      <section className="mb-10">
        <SectionTitle>6. La tabla de posiciones</SectionTitle>
        <div className="bg-card border border-border rounded-lg p-5 text-sm">
          <ul className="list-disc list-inside space-y-2">
            <li>
              En <Link href="/ranking" className="text-accent hover:underline font-bold">Posiciones</Link>{" "}
              ves el ranking en vivo de todos los participantes (es pública, no necesitas iniciar sesión).
            </li>
            <li>Los puntos se actualizan <b>automáticamente</b> con cada partido terminado.</li>
            <li>
              <b>Desempate:</b> si dos participantes igualan en puntos, queda arriba quien
              tenga más <b>marcadores exactos</b>.
            </li>
          </ul>
        </div>
      </section>

      {/* 7. Premios */}
      <section className="mb-10">
        <SectionTitle>7. Los premios 💰</SectionTitle>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-5 pb-0 text-sm">
            <p>
              La bolsa sale del recaudo total: <b>inscripciones + recargas</b> y se
              reparte así:
            </p>
          </div>
          <table className="w-full text-sm mt-4">
            <thead>
              <tr className="bg-black/40 text-muted-foreground text-[11px] uppercase tracking-wider font-bold">
                <th className="p-3 text-left">Premio</th>
                <th className="p-3 text-right">% de la bolsa</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["🥇 1er puesto del ranking", "50%"],
                ["🥈 2do puesto", "20%"],
                ["🥉 3er puesto", "10%"],
                ["🎯 Quien logre más marcadores exactos", "5%"],
                ["✅ Quien acierte más ganadores", "5%"],
                ["🏆 Quien haya atinado al campeón", "5%"],
                ["⚽ Quien haya atinado al goleador", "5%"],
              ].map(([label, pct], i) => (
                <tr key={label} className={`border-t border-border ${i % 2 ? "bg-black/20" : ""}`}>
                  <td className="p-3">{label}</td>
                  <td className="p-3 text-right font-black text-accent">{pct}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-5 text-sm text-muted-foreground space-y-3">
            <p>
              Los montos exactos en pesos están siempre visibles en la página{" "}
              <Link href="/ranking" className="text-accent hover:underline font-bold">Posiciones</Link>{" "}
              (crecen a medida que entran más participantes).
            </p>
            <p className="border-l-4 border-accent pl-3">
              <b className="text-foreground">¿Y si varios aciertan un mismo premio?</b>{" "}
              (p. ej. dos personas atinaron al campeón) El premio se{" "}
              <b className="text-foreground">divide en partes iguales</b> entre quienes
              acertaron, mostrados en el orden del ranking final. O, por acuerdo entre
              los ganadores, el premio completo se lo puede llevar el mejor ranqueado.
            </p>
          </div>
        </div>
      </section>

      {/* 8. Reglas */}
      <section className="mb-10">
        <SectionTitle>8. Reglas claras</SectionTitle>
        <div className="bg-card border border-border rounded-lg p-5 text-sm">
          <ol className="list-decimal list-inside space-y-2">
            <li>Solo compiten por premios quienes hayan <b>pagado la cuota de inscripción</b>.</li>
            <li>
              Los pronósticos de partido se bloquean <b>al inicio de cada partido</b>; los
              especiales se bloquean <b>el 27 de junio de 2026</b>.
            </li>
            <li>
              Pronosticar las <b>fases finales requiere haber pagado la recarga</b>. Quien
              no recargue conserva sus puntos de grupos pero no suma más.
            </li>
            <li>Quien no pague o quiera retirarse será retirado de la polla por el organizador.</li>
            <li>Los resultados los trae automáticamente la plataforma de fuentes oficiales.</li>
          </ol>
        </div>
      </section>

      {/* 9. FAQ */}
      <section className="mb-10">
        <SectionTitle>9. Preguntas frecuentes</SectionTitle>
        <div className="bg-card border border-border rounded-lg p-5 text-sm space-y-3">
          <p><b>¿Puedo cambiar un pronóstico?</b> Sí, hasta que el partido empiece.</p>
          <p><b>¿Olvidé mi contraseña?</b> Contacta al organizador.</p>
          <p>
            <b>¿Puedo entrar después de iniciado el Mundial?</b> Lo decide el organizador
            (tendrías menos partidos para sumar).
          </p>
          <p>
            <b>¿Cómo sé cuántos puntos me dio un partido?</b> En Mi Apuesta, cada partido
            terminado muestra tu pronóstico y los puntos que te dejó.
          </p>
          <p>
            <b>¿Qué pasa si no pago la recarga?</b> Conservas tus puntos de grupos y
            sigues en la tabla, pero no puedes pronosticar las fases finales (dejas de sumar).
          </p>
          <p>
            <b>¿La recarga es por cada fase?</b> No: es <b>un solo pago</b> que cubre
            todas las eliminatorias, desde dieciseisavos hasta la final.
          </p>
        </div>
      </section>

      {/* Cierre */}
      <div className="text-center bg-card border border-border rounded-lg p-6 mb-4">
        <p className="font-black uppercase text-accent mb-2">
          ⏰ Fecha límite para inscribirse y pagar: 12/06/2026
        </p>
        <p className="text-muted-foreground text-sm mb-4">¡Que gane el que más sepa de fútbol! 🍀⚽</p>
        <Link href="/login"
          className="inline-block px-8 py-3 rounded bg-primary text-primary-foreground headline text-lg hover:bg-primary/90 transition-colors">
          Quiero jugar
        </Link>
      </div>
    </div>
  );
}
